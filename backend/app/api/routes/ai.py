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

    # Guardrails: Block clearly off-topic queries, but allow conversational messages
    blocked_keywords = {
        # Completely off-topic
        "recipe", "cooking", "food", "restaurant", "weather", "sports", "game", "movie", "film",
        "music", "song", "celebrity", "politics", "election", "religion", "medical", "health",
        "doctor", "medicine", "travel", "vacation", "hotel", "flight", "car", "vehicle",
        "shopping", "buy", "purchase", "product", "price", "sale",
    }
    
    # Allow conversational keywords (greetings, identity, help requests)
    conversational_keywords = {
        "hi", "hello", "hey", "thanks", "thank", "please", "help", "i am", "i'm", "my",
        "what", "how", "why", "when", "where", "can you", "could you", "would you",
        "tell me", "show me", "explain", "describe", "yes", "no", "ok", "okay"
    }
    
    # Allowed topic keywords
    allowed_keywords = {
        # Site & navigation
        "website", "site", "page", "navigate", "navigation", "find", "where", "cogniwork",
        # Resume / profile / candidates
        "resume", "cv", "profile", "candidate", "applicant", "application",
        # Jobs & hiring
        "job", "apply", "career", "opening", "opportunity", "role", "position", "hire", "hiring",
        # Skills & requirements
        "skill", "requirement", "qualification", "experience", "expertise",
        # Projects / portfolio / work
        "project", "portfolio", "work", "github", "repository", "repo",
        # Technology & development
        "tech", "technology", "programming", "coding", "software", "framework", "stack",
        "tool", "language", "developer", "engineer", "development", "dev", "web", "frontend",
        "backend", "fullstack", "database", "api", "code", "app", "application",
        "ai", "ml", "data", "analytics", "cloud", "devops", "mobile", "design",
        # Company / HR
        "company", "organization", "team", "employee", "hr", "human resources",
        "performance", "review", "goal", "meeting", "manager",
        # Job market
        "market", "trend", "salary", "compensation", "industry", "demand",
    }

    q_lower = (req.prompt or "").lower()
    
    # Block if clearly off-topic
    if any(k in q_lower for k in blocked_keywords):
        return ChatResponse(text=(
            "I'm CogniBot, specialized in helping with careers, technology, and our platform. "
            "I can't help with that topic, but feel free to ask about jobs, resumes, skills, projects, or site navigation!"
        ))
    
    # Allow if conversational or on-topic
    is_conversational = any(k in q_lower for k in conversational_keywords)
    is_on_topic = any(k in q_lower for k in allowed_keywords)
    
    # Only reject if it's not conversational AND not on-topic AND longer than 3 words
    # (Short messages like "ok" or "thanks" should pass through)
    if not is_conversational and not is_on_topic and len(q_lower.split()) > 3:
        return ChatResponse(text=(
            "I'm here to help with careers, jobs, resumes, skills, projects, and navigating our platform. "
            "What would you like to know?"
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
