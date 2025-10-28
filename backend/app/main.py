from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.router import api_router
from app.db.mongo import init_mongo
from app.models import User
from app.core.security import get_password_hash
from app.services.scheduler import start_scheduler, stop_scheduler
import os

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")

app.add_middleware(
    CORSMiddleware,
    # For local dev, allow all origins (covers localhost/127.0.0.1 mismatch)
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # Initialize Mongo + Beanie
    await init_mongo()
    # Seed admin if not exists
    admin_email = "admin@cogniwork.dev"
    existing = await User.find_one(User.email == admin_email)
    if not existing:
        admin = User(email=admin_email, full_name="Admin", role="admin", hashed_password=get_password_hash("admin"))
        await admin.insert()
    # Ensure uploads directory exists and mount static
    upload_dir = os.getenv("UPLOAD_DIR", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    try:
        app.mount("/static", StaticFiles(directory=upload_dir), name="static")
    except Exception:
        # Already mounted in hot-reload
        pass
    # Start background scheduler
    start_scheduler(app)


@app.on_event("shutdown")
async def on_shutdown():
    stop_scheduler(app)


@app.get("/")
async def root():
    return {"message": "CogniWork API is running"}


app.include_router(api_router, prefix=settings.API_V1_STR)
