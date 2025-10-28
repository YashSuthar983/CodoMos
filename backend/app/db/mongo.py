from typing import Sequence
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models import (
    User,
    Candidate,
    JobRole,
    Repo,
    Project,
    Form,
    FormResponse,
    Task,
    XPEvent,
    XPConfiguration,
    AppSettings,
    RepositoryMetadata,
    Branch,
    Commit,
    Issue,
    PullRequest,
    Contributor,
    Release,
    Milestone,
    ProjectBoard,
    Activity,
    XPLeaderboard,
    Message,
    Channel,
    Announcement,
    Notification,
    NotificationPreference,
    EmailTemplate,
)

_client: AsyncIOMotorClient | None = None


async def init_mongo() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = _client[settings.MONGODB_DB]
    await init_beanie(
        database=db,
        document_models=[
            User,
            Candidate,
            JobRole,
            Repo,
            Project,
            Form,
            FormResponse,
            Task,
            XPEvent,
            XPConfiguration,
            AppSettings,
            RepositoryMetadata,
            Branch,
            Commit,
            Issue,
            PullRequest,
            Contributor,
            Release,
            Milestone,
            ProjectBoard,
            Activity,
            XPLeaderboard,
            Message,
            Channel,
            Announcement,
            Notification,
            NotificationPreference,
            EmailTemplate,
        ],
    )


def get_client() -> AsyncIOMotorClient:
    assert _client is not None, "Mongo client not initialized"
    return _client
