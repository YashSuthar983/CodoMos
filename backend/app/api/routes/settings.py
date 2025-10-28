"""
Application Settings API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_current_user
from app.models import User, AppSettings


router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    """Settings update schema"""
    # GitHub Integration
    github_pat: Optional[str] = None
    github_app_id: Optional[str] = None
    github_app_private_key: Optional[str] = None
    github_webhook_secret: Optional[str] = None
    github_default_org: Optional[str] = None
    
    # Notifications
    slack_webhook_url: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    email_notifications_enabled: Optional[bool] = None
    
    # XP System
    xp_system_enabled: Optional[bool] = None
    xp_decay_enabled: Optional[bool] = None
    xp_streak_enabled: Optional[bool] = None
    
    # Feature Flags
    github_insights_enabled: Optional[bool] = None
    ai_features_enabled: Optional[bool] = None
    forms_enabled: Optional[bool] = None
    
    # Sync Settings
    auto_sync_enabled: Optional[bool] = None
    sync_interval_hours: Optional[int] = None


class SettingsResponse(BaseModel):
    """Settings response with masked sensitive data"""
    # GitHub Integration
    github_pat: Optional[str] = None
    github_app_id: Optional[str] = None
    github_app_private_key: Optional[str] = None
    github_webhook_secret: Optional[str] = None
    github_default_org: Optional[str] = None
    
    # Notifications
    slack_webhook_url: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    email_notifications_enabled: bool
    
    # XP System
    xp_system_enabled: bool
    xp_decay_enabled: bool
    xp_streak_enabled: bool
    
    # Feature Flags
    github_insights_enabled: bool
    ai_features_enabled: bool
    forms_enabled: bool
    
    # Sync Settings
    auto_sync_enabled: bool
    sync_interval_hours: int
    
    # Metadata
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None


@router.get("/", response_model=SettingsResponse)
async def get_settings(current_user: User = Depends(get_current_user)):
    """Get application settings (masked sensitive data for non-admins)"""
    settings = await AppSettings.get_app_settings()
    
    # Prepare response data
    response_data = settings.mask_sensitive_data()
    
    # For non-admin users, mask sensitive data
    if current_user.role != "admin":
        return SettingsResponse(**response_data)
    
    # For admin users, still mask but show partial info
    return SettingsResponse(**response_data)


@router.put("/", response_model=SettingsResponse)
async def update_settings(
    settings_update: SettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update application settings (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    # Filter out None values
    update_data = {k: v for k, v in settings_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Update settings
    settings = await AppSettings.update_app_settings(update_data, str(current_user.id))
    
    # Return masked data
    return SettingsResponse(**settings.mask_sensitive_data())


class GitHubTestRequest(BaseModel):
    """Request body for testing GitHub connection"""
    github_pat: Optional[str] = None


@router.post("/github/test")
async def test_github_connection(
    test_request: Optional[GitHubTestRequest] = None,
    current_user: User = Depends(get_current_user)
):
    """Test GitHub connection with provided PAT or saved PAT"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    # Try to get PAT from request body first, then from settings
    github_pat = None
    if test_request and test_request.github_pat:
        github_pat = test_request.github_pat
    else:
        settings = await AppSettings.get_app_settings()
        github_pat = settings.get_github_pat()
    
    if not github_pat:
        raise HTTPException(
            status_code=400, 
            detail="GitHub PAT not provided. Please provide a token to test."
        )
    
    try:
        # Test the connection
        from app.services.github_insights import GitHubInsightsService
        service = GitHubInsightsService(github_pat)
        
        # Try to fetch user info to test the token
        import aiohttp
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {github_pat}",
                "Accept": "application/vnd.github.v3+json"
            }
            async with session.get("https://api.github.com/user", headers=headers) as response:
                if response.status == 200:
                    user_data = await response.json()
                    return {
                        "status": "success",
                        "message": "GitHub connection successful",
                        "user": user_data.get("login"),
                        "scopes": response.headers.get("X-OAuth-Scopes", "").split(", ")
                    }
                else:
                    error_data = await response.json()
                    return {
                        "status": "error",
                        "message": error_data.get("message", "Failed to connect to GitHub")
                    }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Connection test failed: {str(e)}"
        }


@router.get("/github/pat-configured")
async def check_github_pat_configured():
    """Check if GitHub PAT is configured (public endpoint)"""
    settings = await AppSettings.get_app_settings()
    return {
        "configured": bool(settings.get_github_pat()),
        "message": "GitHub PAT is configured" if settings.get_github_pat() else "GitHub PAT not configured"
    }
