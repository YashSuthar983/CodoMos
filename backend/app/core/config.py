from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    PROJECT_NAME: str = "CogniWork API"
    API_V1_STR: str = "/api"

    # Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "devsecretchangeinprod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # CORS (read as comma-separated string from env)
    BACKEND_CORS_ORIGINS: str = Field(default="http://localhost:5173,http://127.0.0.1:5173")

    @property
    def cors_origins_list(self) -> List[str]:
        return [s.strip() for s in (self.BACKEND_CORS_ORIGINS or "").split(",") if s.strip()]

    # MongoDB Atlas (no fallback)
    MONGODB_URI: str
    MONGODB_DB: str = "cogniwork"

    # AI (Gemini)
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    # Public base URL (scheme + host[:port]) for constructing webhook callback URLs
    # Example: http://127.0.0.1:8000 or https://api.example.com
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:8000")
    
    # Frontend URL for emails and redirects
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # SMTP (for email notifications)
    SMTP_HOST: str | None = os.getenv("SMTP_HOST")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str | None = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD")
    SMTP_FROM_EMAIL: str | None = os.getenv("SMTP_FROM_EMAIL")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")


settings = Settings()  # type: ignore
