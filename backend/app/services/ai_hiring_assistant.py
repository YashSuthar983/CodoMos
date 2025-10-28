"""
AI Hiring Assistant Service
Analyzes candidate form responses and attachments to provide unbiased suggestions.
Note: AI provides SUGGESTIONS only - final decisions are made by humans.
"""

import json
import base64
from typing import Dict, List, Any, Optional
from pathlib import Path

from app.core.config import settings

try:
    import google.generativeai as genai  # type: ignore
    from google.generativeai.types import HarmCategory, HarmBlockThreshold
except Exception:  # pragma: no cover - optional import
    genai = None


def _make_model(with_vision: bool = False):
    """Create Gemini model instance"""
    if not settings.GEMINI_API_KEY or genai is None:
        return None
    
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    # Use vision model if analyzing attachments, otherwise use pro
    model_name = "gemini-1.5-flash" if with_vision else settings.GEMINI_MODEL
    
    generation_config = {
        "temperature": 0.3,  # Lower temperature for more consistent, objective analysis
        "top_p": 0.8,
        "top_k": 40,
        "max_output_tokens": 2048,
    }
    
    safety_settings = {
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }
    
    return genai.GenerativeModel(
        model_name=model_name,
        generation_config=generation_config,
        safety_settings=safety_settings
    )


def analyze_form_response(
    form_response: Dict[str, Any],
    position: str,
    evaluation_criteria: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Analyze a candidate's form response and provide unbiased evaluation.
    
    Args:
        form_response: Dictionary of form field responses
        position: Position being applied for
        evaluation_criteria: List of criteria to evaluate (optional)
    
    Returns:
        Dictionary with AI analysis including:
        - overall_score: 0-100
        - technical_score: 0-100
        - cultural_fit_score: 0-100
        - strengths: List of strengths
        - concerns: List of concerns
        - recommendations: List of suggestions
        - bias_check: Analysis of potential biases
    """
    model = _make_model()
    
    if model is None:
        return _fallback_analysis()
    
    criteria = evaluation_criteria or [
        "Technical skills and experience",
        "Problem-solving ability",
        "Communication skills",
        "Cultural fit",
        "Growth potential"
    ]
    
    system_prompt = """You are an unbiased hiring assistant AI. Your role is to analyze candidate responses objectively.

IMPORTANT GUIDELINES:
1. Focus ONLY on skills, experience, and qualifications
2. Ignore name, gender, age, ethnicity, or any protected characteristics
3. Base analysis on concrete evidence from responses
4. Provide constructive, actionable feedback
5. Highlight both strengths and areas for growth
6. Your recommendations are SUGGESTIONS - humans make final decisions
7. Be aware of and flag any potential biases

Output ONLY valid JSON with this structure:
{
    "overall_score": <0-100>,
    "technical_score": <0-100>,
    "cultural_fit_score": <0-100>,
    "strengths": [<list of specific strengths with examples>],
    "concerns": [<list of potential concerns or gaps>],
    "recommendations": [<actionable suggestions for next steps>],
    "bias_check": "<analysis of potential biases in evaluation>",
    "confidence_level": "<high|medium|low>",
    "reasoning": "<brief explanation of scores>"
}"""
    
    user_prompt = {
        "task": "Analyze candidate form response",
        "position": position,
        "evaluation_criteria": criteria,
        "form_responses": form_response,
        "instructions": "Provide objective, unbiased analysis focusing on qualifications and skills."
    }
    
    try:
        response = model.generate_content([system_prompt, json.dumps(user_prompt, indent=2)])
        text = response.text or "{}"
        
        # Extract JSON from response
        text = text.strip().strip('`').replace('```json', '').replace('```', '')
        start = text.find('{')
        end = text.rfind('}')
        
        if start == -1 or end == -1:
            return _fallback_analysis()
        
        analysis = json.loads(text[start:end+1])
        
        # Validate and sanitize
        return {
            "overall_score": min(100, max(0, float(analysis.get("overall_score", 50)))),
            "technical_score": min(100, max(0, float(analysis.get("technical_score", 50)))),
            "cultural_fit_score": min(100, max(0, float(analysis.get("cultural_fit_score", 50)))),
            "strengths": analysis.get("strengths", [])[:10],
            "concerns": analysis.get("concerns", [])[:10],
            "recommendations": analysis.get("recommendations", [])[:10],
            "bias_check": analysis.get("bias_check", "No bias detected"),
            "confidence_level": analysis.get("confidence_level", "medium"),
            "reasoning": analysis.get("reasoning", "Analysis completed"),
            "ai_analyzed": True,
            "model_version": "gemini-pro",
            "disclaimer": "AI-generated suggestions - human review required"
        }
        
    except Exception as e:
        return {
            **_fallback_analysis(),
            "error": str(e)
        }


def analyze_attachment(
    file_content: bytes,
    file_type: str,
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Analyze an attachment (resume, portfolio, code sample, etc.)
    
    Args:
        file_content: Binary content of the file
        file_type: MIME type or file extension
        context: Additional context (position, form responses, etc.)
    
    Returns:
        Dictionary with analysis results
    """
    model = _make_model(with_vision=True)
    
    if model is None:
        return _fallback_attachment_analysis()
    
    # Determine if we can process this file type
    supported_types = ['pdf', 'jpg', 'jpeg', 'png', 'txt', 'md']
    ext = file_type.lower().split('/')[-1].split('.')[-1]
    
    if ext not in supported_types:
        return {
            "error": f"Unsupported file type: {file_type}",
            "supported_types": supported_types
        }
    
    system_prompt = """You are analyzing a candidate's attachment (resume, portfolio, code sample, etc.).

GUIDELINES:
1. Extract relevant skills, experience, and qualifications
2. Assess quality and presentation
3. Identify red flags or inconsistencies
4. Focus on objective criteria only
5. Do NOT consider name, age, gender, or protected characteristics
6. Provide constructive feedback

Output ONLY valid JSON with this structure:
{
    "summary": "<brief summary of document>",
    "key_skills": [<list of skills found>],
    "experience_years": <estimated years if applicable>,
    "education": [<educational qualifications>],
    "highlights": [<notable achievements or projects>],
    "quality_score": <0-100 for document quality/presentation>,
    "relevance_score": <0-100 for job relevance>,
    "concerns": [<any concerns or gaps>],
    "recommendations": [<suggestions>]
}"""
    
    try:
        # For text-based files, extract text
        if ext in ['txt', 'md']:
            content_text = file_content.decode('utf-8', errors='ignore')
            prompt_parts = [
                system_prompt,
                f"Context: {json.dumps(context)}",
                f"Document Content:\n{content_text[:10000]}"  # Limit to 10k chars
            ]
        else:
            # For images/PDFs, use vision capabilities
            prompt_parts = [
                system_prompt,
                f"Context: {json.dumps(context)}",
                {
                    "mime_type": file_type,
                    "data": base64.b64encode(file_content).decode('utf-8')
                }
            ]
        
        response = model.generate_content(prompt_parts)
        text = response.text or "{}"
        
        # Extract JSON
        text = text.strip().strip('`').replace('```json', '').replace('```', '')
        start = text.find('{')
        end = text.rfind('}')
        
        if start == -1 or end == -1:
            return _fallback_attachment_analysis()
        
        analysis = json.loads(text[start:end+1])
        
        return {
            "summary": analysis.get("summary", ""),
            "key_skills": analysis.get("key_skills", [])[:20],
            "experience_years": analysis.get("experience_years"),
            "education": analysis.get("education", [])[:5],
            "highlights": analysis.get("highlights", [])[:10],
            "quality_score": min(100, max(0, float(analysis.get("quality_score", 50)))),
            "relevance_score": min(100, max(0, float(analysis.get("relevance_score", 50)))),
            "concerns": analysis.get("concerns", [])[:10],
            "recommendations": analysis.get("recommendations", [])[:10],
            "ai_analyzed": True,
            "file_type": file_type,
            "disclaimer": "AI-generated analysis - human review required"
        }
        
    except Exception as e:
        return {
            **_fallback_attachment_analysis(),
            "error": str(e)
        }


def compare_candidates(
    candidates_data: List[Dict[str, Any]],
    position: str,
    criteria: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Compare multiple candidates objectively and rank them.
    
    Args:
        candidates_data: List of candidate data including form responses and scores
        position: Position being hired for
        criteria: Evaluation criteria
    
    Returns:
        Dictionary with ranking and comparison analysis
    """
    model = _make_model()
    
    if model is None or len(candidates_data) == 0:
        return {"error": "Cannot compare candidates"}
    
    system_prompt = """You are comparing candidates objectively for a hiring decision.

CRITICAL RULES:
1. Compare ONLY on skills, experience, and qualifications
2. Be completely unbiased - ignore all protected characteristics
3. Provide data-driven reasoning for rankings
4. Acknowledge limitations in your analysis
5. Your ranking is a SUGGESTION - humans make final decisions

Output ONLY valid JSON with this structure:
{
    "rankings": [
        {
            "candidate_id": "<id>",
            "rank": <1, 2, 3, etc.>,
            "reasoning": "<why this ranking>",
            "standout_qualities": [<list>]
        }
    ],
    "comparison_insights": "<overall comparison insights>",
    "recommendations": [<suggestions for interview process>],
    "bias_warning": "<any potential biases to be aware of>"
}"""
    
    user_prompt = {
        "task": "Compare and rank candidates",
        "position": position,
        "criteria": criteria or ["Skills", "Experience", "Cultural fit", "Growth potential"],
        "candidates": candidates_data
    }
    
    try:
        response = model.generate_content([system_prompt, json.dumps(user_prompt, indent=2)])
        text = response.text or "{}"
        
        text = text.strip().strip('`').replace('```json', '').replace('```', '')
        start = text.find('{')
        end = text.rfind('}')
        
        if start == -1 or end == -1:
            return {"error": "Failed to parse comparison"}
        
        comparison = json.loads(text[start:end+1])
        
        return {
            **comparison,
            "ai_generated": True,
            "disclaimer": "AI suggestions only - final decisions require human judgment",
            "candidates_compared": len(candidates_data)
        }
        
    except Exception as e:
        return {"error": str(e)}


def _fallback_analysis() -> Dict[str, Any]:
    """Fallback when AI is unavailable"""
    return {
        "overall_score": 50,
        "technical_score": 50,
        "cultural_fit_score": 50,
        "strengths": ["Please review manually"],
        "concerns": ["AI analysis unavailable"],
        "recommendations": ["Manual review required"],
        "bias_check": "N/A - AI unavailable",
        "confidence_level": "none",
        "reasoning": "AI service unavailable - manual review required",
        "ai_analyzed": False,
        "disclaimer": "AI unavailable - manual analysis required"
    }


def analyze_resume_for_job(
    resume_text: str,
    job_title: str,
    job_description: str,
    requirements: List[str],
    nice_to_have: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Analyze a resume against specific job requirements and generate a match score.
    
    Args:
        resume_text: Full text content of the resume
        job_title: Title of the job position
        job_description: Detailed job description
        requirements: List of required qualifications/skills
        nice_to_have: List of preferred qualifications (optional)
    
    Returns:
        Dictionary with analysis including match_score (0-100), matched_requirements,
        missing_requirements, strengths, concerns, and recommendations
    """
    model = _make_model()
    
    if model is None:
        return _fallback_resume_job_analysis()
    
    system_prompt = """You are an expert resume analyzer for hiring. Analyze the resume against the job requirements.

GUIDELINES:
1. Compare resume content against EACH job requirement
2. Calculate match score based on how many requirements are met
3. Be objective - focus on skills, experience, qualifications
4. Ignore name, gender, age, or any protected characteristics
5. Identify exact matches and partial matches
6. Note missing critical skills
7. Provide actionable recommendations

Output ONLY valid JSON with this structure:
{
    "match_score": <0-100 overall job match score>,
    "technical_match": <0-100 technical skills match>,
    "experience_match": <0-100 experience level match>,
    "matched_requirements": [
        {"requirement": "<requirement>", "evidence": "<where found in resume>", "confidence": "high|medium|low"}
    ],
    "missing_requirements": ["<requirement not found or unclear>"],
    "matched_nice_to_have": ["<optional skills found>"],
    "key_strengths": ["<specific strengths relevant to this job>"],
    "concerns": ["<gaps or concerns for this specific role>"],
    "recommendations": ["<next steps: interview focus areas, skill assessments, etc.>"],
    "years_of_experience": <estimated years>,
    "top_relevant_skills": ["<top 5-10 skills matching job>"],
    "confidence_level": "high|medium|low",
    "summary": "<2-3 sentence summary of candidate fit for THIS job>"
}"""
    
    user_prompt = {
        "task": "Analyze resume for job match",
        "job_title": job_title,
        "job_description": job_description,
        "required_qualifications": requirements,
        "preferred_qualifications": nice_to_have or [],
        "resume_content": resume_text[:8000]  # Limit resume length
    }
    
    try:
        response = model.generate_content([system_prompt, json.dumps(user_prompt, indent=2)])
        text = response.text or "{}"
        
        # Extract JSON from response
        text = text.strip().strip('`').replace('```json', '').replace('```', '')
        start = text.find('{')
        end = text.rfind('}')
        
        if start == -1 or end == -1:
            return _fallback_resume_job_analysis()
        
        analysis = json.loads(text[start:end+1])
        
        # Validate and sanitize
        return {
            "match_score": min(100, max(0, float(analysis.get("match_score", 50)))),
            "technical_match": min(100, max(0, float(analysis.get("technical_match", 50)))),
            "experience_match": min(100, max(0, float(analysis.get("experience_match", 50)))),
            "matched_requirements": analysis.get("matched_requirements", [])[:20],
            "missing_requirements": analysis.get("missing_requirements", [])[:10],
            "matched_nice_to_have": analysis.get("matched_nice_to_have", [])[:10],
            "key_strengths": analysis.get("key_strengths", [])[:10],
            "concerns": analysis.get("concerns", [])[:10],
            "recommendations": analysis.get("recommendations", [])[:10],
            "years_of_experience": analysis.get("years_of_experience"),
            "top_relevant_skills": analysis.get("top_relevant_skills", [])[:10],
            "confidence_level": analysis.get("confidence_level", "medium"),
            "summary": analysis.get("summary", "Resume analyzed"),
            "ai_analyzed": True,
            "model_version": "gemini-pro",
            "job_title": job_title,
            "analysis_timestamp": json.dumps({"date": "analyzed"}),
            "disclaimer": "AI-generated analysis - human review required for hiring decisions"
        }
        
    except Exception as e:
        return {
            **_fallback_resume_job_analysis(),
            "error": str(e)
        }


def _fallback_resume_job_analysis() -> Dict[str, Any]:
    """Fallback when AI is unavailable for resume job analysis"""
    return {
        "match_score": 50,
        "technical_match": 50,
        "experience_match": 50,
        "matched_requirements": [],
        "missing_requirements": [],
        "matched_nice_to_have": [],
        "key_strengths": ["Manual review required"],
        "concerns": ["AI analysis unavailable"],
        "recommendations": ["Please review resume manually"],
        "years_of_experience": None,
        "top_relevant_skills": [],
        "confidence_level": "none",
        "summary": "AI analysis unavailable - manual review required",
        "ai_analyzed": False,
        "disclaimer": "AI unavailable - manual analysis required"
    }


def _fallback_attachment_analysis() -> Dict[str, Any]:
    """Fallback for attachment analysis"""
    return {
        "summary": "AI analysis unavailable",
        "key_skills": [],
        "quality_score": 50,
        "relevance_score": 50,
        "concerns": ["Manual review required"],
        "recommendations": ["Please review attachment manually"],
        "ai_analyzed": False,
        "disclaimer": "AI unavailable - manual analysis required"
    }
