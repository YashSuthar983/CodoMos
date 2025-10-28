"""
Application Settings Model
Centralized configuration for GitHub integration and other settings
"""
from datetime import datetime
from typing import Optional, Dict, List
from beanie import Document
from pydantic import Field


class AppSettings(Document):
    """
    Centralized application settings
    Singleton pattern - only one document should exist
    """
    # GitHub Integration Settings
    github_pat: Optional[str] = None  # Organization-wide GitHub Personal Access Token
    github_app_id: Optional[str] = None
    github_app_private_key: Optional[str] = None
    github_webhook_secret: Optional[str] = None
    github_default_org: Optional[str] = None
    
    # Notification Settings
    slack_webhook_url: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    email_notifications_enabled: bool = False
    
    # XP System Settings
    xp_system_enabled: bool = True
    xp_decay_enabled: bool = False
    xp_streak_enabled: bool = True
    
    # Feature Flags
    github_insights_enabled: bool = True
    ai_features_enabled: bool = True
    forms_enabled: bool = True
    
    # Sync Settings
    auto_sync_enabled: bool = False
    sync_interval_hours: int = 24
    
    # Metadata
    updated_by: Optional[str] = None  # User ID who last updated
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "app_settings"
    
    @classmethod
    async def get_app_settings(cls) -> "AppSettings":
        """Get or create application settings (singleton)"""
        settings = await cls.find_one()
        if not settings:
            settings = cls()
            await settings.insert()
        return settings
    
    @classmethod
    async def update_app_settings(cls, update_data: Dict, updated_by: str) -> "AppSettings":
        """Update application settings"""
        settings = await cls.get_app_settings()
        
        # Update fields
        for key, value in update_data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        
        settings.updated_by = updated_by
        settings.updated_at = datetime.utcnow()
        await settings.save()
        
        return settings
    
    def get_github_pat(self) -> Optional[str]:
        """Get GitHub PAT from settings or environment variable"""
        import os
        return self.github_pat or os.getenv("GITHUB_PAT")
    
    def mask_sensitive_data(self) -> Dict:
        """Return settings with sensitive data masked"""
        data = self.model_dump()
        
        # Mask sensitive fields
        if data.get("github_pat"):
            data["github_pat"] = f"ghp_{'*' * 32}"
        if data.get("github_app_private_key"):
            data["github_app_private_key"] = "***MASKED***"
        if data.get("slack_webhook_url"):
            data["slack_webhook_url"] = "***MASKED***"
        if data.get("discord_webhook_url"):
            data["discord_webhook_url"] = "***MASKED***"
        
        return data
