from typing import Dict, Any, Optional
from beanie import PydanticObjectId
from app.models import Repo, User, XPEvent


DEFAULT_XP = {
    "pr_merged": 10,
    "issue_closed": 5,
    "review_approved": 4,
    "review_commented": 2,
}


def _skill_distribution_from_tags(repo: Repo) -> Optional[Dict[str, float]]:
    tags = repo.tags or []
    if not tags:
        return None
    share = 1 / len(tags)
    return {t: round(share, 3) for t in tags}


async def _award_xp(repo: Repo, gh_username: Optional[str], source: str, amount: Optional[int] = None) -> None:
    if not gh_username:
        return
    user = await User.find_one(User.github_username == gh_username)
    if not user:
        return
    xp_amount = amount if amount is not None else DEFAULT_XP.get(source, 0)
    if xp_amount <= 0:
        return
    skill_distribution = _skill_distribution_from_tags(repo)
    xp = XPEvent(
        person_id=PydanticObjectId(user.id),
        source=source,
        amount=xp_amount,
        skill_distribution=skill_distribution,
    )
    await xp.insert()


async def award_xp_for_pr_merged(repo: Repo, gh_username: Optional[str]):
    await _award_xp(repo, gh_username, "pr_merged")


async def award_xp_for_issue_closed(repo: Repo, gh_username: Optional[str]):
    await _award_xp(repo, gh_username, "issue_closed")


async def award_xp_for_review(repo: Repo, gh_username: Optional[str], state: str):
    if state.lower() == "approved":
        await _award_xp(repo, gh_username, "review_approved")
    elif state.lower() == "commented":
        await _award_xp(repo, gh_username, "review_commented")


async def handle_github_event(event: str, payload: Dict[str, Any], repo: Repo):
    # Minimal handling for PR merged events
    if event == "pull_request":
        action = payload.get("action")
        pr = payload.get("pull_request", {})
        merged = pr.get("merged")
        user_login = (pr.get("user") or {}).get("login")
        if action in ("closed",) and merged:
            await award_xp_for_pr_merged(repo, user_login)
    elif event == "pull_request_review":
        # Award reviewers for approved/commented reviews
        action = payload.get("action")
        if action == "submitted":
            review = payload.get("review", {})
            state = (review.get("state") or "").lower()
            reviewer_login = (review.get("user") or {}).get("login") or (payload.get("sender") or {}).get("login")
            if state in ("approved", "commented"):
                await award_xp_for_review(repo, reviewer_login, state)
    elif event == "issues":
        # Award the actor who closed an issue
        action = payload.get("action")
        if action == "closed":
            closer_login = (payload.get("sender") or {}).get("login")
            await award_xp_for_issue_closed(repo, closer_login)
