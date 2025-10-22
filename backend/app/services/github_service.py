from typing import Dict, Any, Optional
from beanie import PydanticObjectId
from app.models import Repo, User, XPEvent


DEFAULT_XP = {
    "pr_merged": 10,
    "issue_closed": 5,
    "review_approved": 4,
    "review_commented": 2,
}


async def award_xp_for_pr_merged(repo: Repo, gh_username: Optional[str]):
    if not gh_username:
        return
    user = await User.find_one(User.github_username == gh_username)
    if not user:
        return
    tags = repo.tags or []
    share = 1 / len(tags) if tags else 1
    skill_distribution = {t: round(share, 3) for t in tags} if tags else None
    xp = XPEvent(person_id=PydanticObjectId(user.id), source="pr_merged", amount=DEFAULT_XP["pr_merged"], skill_distribution=skill_distribution)
    await xp.insert()


async def handle_github_event(event: str, payload: Dict[str, Any], repo: Repo):
    # Minimal handling for PR merged events
    if event == "pull_request":
        action = payload.get("action")
        pr = payload.get("pull_request", {})
        merged = pr.get("merged")
        user_login = (pr.get("user") or {}).get("login")
        if action in ("closed",) and merged:
            await award_xp_for_pr_merged(repo, user_login)
