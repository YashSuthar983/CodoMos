import httpx
from typing import List, Optional

from app.core.config import settings

GITHUB_API = "https://api.github.com"


class GitHubAPIError(Exception):
    pass


async def create_repo_webhook(
    owner: str,
    repo: str,
    callback_url: str,
    secret: str,
    token: str,
    events: Optional[List[str]] = None,
) -> int:
    events = events or ["pull_request", "pull_request_review", "issues"]
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    }
    payload = {
        "name": "web",
        "active": True,
        "events": events,
        "config": {
            "url": callback_url,
            "content_type": "json",
            "secret": secret,
            "insecure_ssl": "0",
        },
    }
    url = f"{GITHUB_API}/repos/{owner}/{repo}/hooks"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(url, headers=headers, json=payload)
        if r.status_code not in (201,):
            raise GitHubAPIError(f"Failed to create webhook: {r.status_code} {r.text}")
        data = r.json()
        return int(data.get("id"))


async def delete_repo_webhook(owner: str, repo: str, hook_id: int, token: str) -> None:
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    }
    url = f"{GITHUB_API}/repos/{owner}/{repo}/hooks/{hook_id}"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.delete(url, headers=headers)
        if r.status_code not in (204,):
            raise GitHubAPIError(f"Failed to delete webhook: {r.status_code} {r.text}")


async def list_accessible_repos(
    token: str,
    *,
    per_page: int = 100,
    page: int = 1,
    affiliation: str = "owner,collaborator,organization_member",
    visibility: str = "all",
) -> List[dict]:
    """List repositories the PAT has access to.

    This calls GET /user/repos which returns repos the authenticated user can access,
    including private repos in orgs when scopes allow it.
    """
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    }
    params = {
        "per_page": per_page,
        "page": page,
        "affiliation": affiliation,
        "visibility": visibility,
        # sorted by updated desc implicitly
    }
    url = f"{GITHUB_API}/user/repos"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, headers=headers, params=params)
        if r.status_code != 200:
            raise GitHubAPIError(f"Failed to list repos: {r.status_code} {r.text}")
        return r.json()
