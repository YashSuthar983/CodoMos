from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.router import api_router
from app.db.mongo import init_mongo
from app.models import User
from app.core.security import get_password_hash

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


@app.get("/")
async def root():
    return {"message": "CogniWork API is running"}


app.include_router(api_router, prefix=settings.API_V1_STR)
