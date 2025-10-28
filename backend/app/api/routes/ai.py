from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import google.generativeai as genai

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"]) 


class ChatRequest(BaseModel):
    prompt: str
    history: list[dict] | None = None  # [{role:"user"|"model", content:"..."}]


class ChatResponse(BaseModel):
    text: str


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, user: User = Depends(get_current_user)):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model_name = settings.GEMINI_MODEL or "gemini-2.0-flash"

    # Guardrails: allow only specific topics
    allowed_keywords = {
        # Site & navigation
        "website", "site", "page", "navigate", "navigation", "how to find", "where is",
        # Resume / profile
        "resume", "cv", "profile",
        # Jobs & applications
        "job", "application", "apply", "careers", "openings", "opportunities", "roles",
        # Skills & requirements
        "skills", "requirements", "qualifications",
        # Projects / portfolio
        "projects", "portfolio", "project",
        # Technology topics
        "tech", "technology", "programming", "coding", "software", "framework", "stack", "tool", "language", "ai", "ml", "data",
        # Job market topics
        "job market", "market", "hiring", "demand", "trend", "salary", "compensation", "industry",
    }

    q_lower = (req.prompt or "").lower()
    if not any(k in q_lower for k in allowed_keywords):
        return ChatResponse(text=(
            "I can help only with our site, jobs, resumes, skills, projects, and navigation."
        ))

    try:
        system_prompt = (
            "You are CogniBot. Stay strictly on these topics: the website, resume/profile, job applications, "
            "skills needed, projects/portfolio, site navigation, job opportunities, technology topics (programming, tools, stacks), "
            "and job market insights (hiring trends, demand, salaries). Politely refuse other topics.\n"
            "Style: very readable. Use short paragraphs and simple bullet lists. Avoid long blocks of text."
        )
        model = genai.GenerativeModel(model_name, system_instruction=system_prompt)
        # Convert history if provided
        chat = model.start_chat(history=[
            {"role": h.get("role", "user"), "parts": [h.get("content", "")]} for h in (req.history or [])
        ])
        resp = await chat.send_message_async(req.prompt)
        text = getattr(resp, 'text', None) or (resp.candidates[0].content.parts[0].text if resp.candidates else "")
        return ChatResponse(text=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {e}")
