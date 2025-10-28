from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from beanie import PydanticObjectId

from app.api.deps import get_current_user
from app.models import Repo, Project, User, AppSettings
from app.schemas.project import (
    RepoCreate, RepoOut, RepoUpdate,
    ProjectCreate, ProjectOut, ProjectUpdate,
    ProjectMemberOut,
)
from pydantic import BaseModel, EmailStr
from app.services.github_admin import create_repo_webhook, delete_repo_webhook, GitHubAPIError, list_accessible_repos
from app.core.config import settings

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/repos", response_model=RepoOut)
async def create_repo(payload: RepoCreate, current_user: User = Depends(get_current_user)):
    repo = Repo(
        provider=payload.provider or "github",
        external_id=payload.external_id,
        name=payload.name,
        webhook_secret=payload.webhook_secret,
        tags=payload.tags,
        owner=payload.owner,
        repo_name=payload.repo_name,
    )
    await repo.insert()
    return repo


@router.get("/repos", response_model=List[RepoOut])
async def list_repos(current_user: User = Depends(get_current_user)):
    return await Repo.find_all().sort(-Repo.created_at).to_list()


@router.patch("/repos/{repo_id}", response_model=RepoOut)
async def update_repo(repo_id: str, payload: RepoUpdate, current_user: User = Depends(get_current_user)):
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(repo, field, value)
    await repo.save()
    return repo


class GitHubWebhookCreate(BaseModel):
    owner: Optional[str] = None
    repo_name: Optional[str] = None
    events: Optional[List[str]] = None


@router.post("/repos/{repo_id}/github/webhook", response_model=RepoOut)
async def create_github_webhook(
    repo_id: str,
    body: GitHubWebhookCreate | None = None,
    request: Request = None,
    current_user: User = Depends(get_current_user),
):
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    
    # Get GitHub PAT from centralized settings
    app_settings = await AppSettings.get_app_settings()
    token = app_settings.github_pat
    if not token:
        raise HTTPException(
            status_code=400, 
            detail="GitHub PAT not configured. Please configure it in Settings → GitHub Integration."
        )

    # Ensure owner/repo_name
    if body:
        if body.owner:
            repo.owner = body.owner
        if body.repo_name:
            repo.repo_name = body.repo_name
    if not repo.owner or not repo.repo_name:
        raise HTTPException(status_code=400, detail="Repo owner/repo_name required")
    if not repo.webhook_secret:
        raise HTTPException(status_code=400, detail="Repo webhook_secret required to create GitHub webhook")

    callback_url = f"{settings.PUBLIC_BASE_URL}{settings.API_V1_STR}/v1/integrations/github/webhook/{repo_id}"
    try:
        hook_id = await create_repo_webhook(
            owner=repo.owner,
            repo=repo.repo_name,
            callback_url=callback_url,
            secret=repo.webhook_secret,
            token=token,
            events=body.events if body and body.events else None,
        )
    except GitHubAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    repo.webhook_id = hook_id
    await repo.save()
    return repo


@router.delete("/repos/{repo_id}/github/webhook", response_model=RepoOut)
async def delete_github_webhook(repo_id: str, request: Request = None, current_user: User = Depends(get_current_user)):
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    
    # Get GitHub PAT from centralized settings
    app_settings = await AppSettings.get_app_settings()
    token = app_settings.github_pat
    if not token:
        raise HTTPException(
            status_code=400,
            detail="GitHub PAT not configured. Please configure it in Settings → GitHub Integration."
        )
    if not repo.owner or not repo.repo_name or not repo.webhook_id:
        raise HTTPException(status_code=400, detail="Repo owner/repo_name/webhook_id required")

    try:
        await delete_repo_webhook(owner=repo.owner, repo=repo.repo_name, hook_id=int(repo.webhook_id), token=token)
    except GitHubAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    repo.webhook_id = None
    await repo.save()
    return repo


class GitHubRepoSummary(BaseModel):
    id: int
    full_name: str
    name: str
    owner_login: str
    private: Optional[bool] = None
    html_url: Optional[str] = None
    default_branch: Optional[str] = None


@router.get("/repos/github/list", response_model=List[GitHubRepoSummary])
async def list_github_repos(
    per_page: int = 50,
    page: int = 1,
    visibility: str = "all",
    affiliation: str = "owner,collaborator,organization_member",
    request: Request = None,
    current_user: User = Depends(get_current_user),
):
    # Get GitHub PAT from centralized settings
    app_settings = await AppSettings.get_app_settings()
    token = app_settings.github_pat
    if not token:
        # Return empty list when no PAT is provided to reduce UX friction
        return []
    try:
        data = await list_accessible_repos(
            token=token,
            per_page=per_page,
            page=page,
            visibility=visibility,
            affiliation=affiliation,
        )
    except GitHubAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    def _map(r: dict) -> GitHubRepoSummary:
        owner = (r.get("owner") or {})
        return GitHubRepoSummary(
            id=int(r.get("id")),
            full_name=r.get("full_name") or f"{owner.get('login','')}/{r.get('name','')}",
            name=r.get("name") or "",
            owner_login=owner.get("login") or "",
            private=r.get("private"),
            html_url=r.get("html_url"),
            default_branch=r.get("default_branch"),
        )

    return [_map(r) for r in data]


# --- Advanced Project Management: Team & Repo Helpers ---

class ProjectMemberIn(BaseModel):
    user_id: str
    role: Optional[str] = "contributor"  # owner, maintainer, contributor


class ProjectMemberByEmail(BaseModel):
    email: EmailStr
    role: Optional[str] = "contributor"


@router.get("/{project_id}/members", response_model=List[ProjectMemberOut])
async def list_project_members(project_id: str, current_user: User = Depends(get_current_user)):
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.members or []


@router.post("/{project_id}/members", response_model=ProjectOut)
async def add_project_member(project_id: str, payload: ProjectMemberIn, current_user: User = Depends(get_current_user)):
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # Validate user exists
    try:
        user = await User.get(PydanticObjectId(payload.user_id))
    except Exception:
        user = None
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Upsert member
    members = project.members or []
    found = False
    for m in members:
        if str(m.user_id) == str(user.id):
            m.role = payload.role or m.role
            found = True
            break
    if not found:
        from app.models.project import ProjectMember  # avoid circular import at top-level
        members.append(ProjectMember(user_id=user.id, role=payload.role or "contributor"))
    project.members = members
    await project.save()
    return project


@router.post("/{project_id}/members/by-email", response_model=ProjectOut)
async def add_project_member_by_email(project_id: str, payload: ProjectMemberByEmail, current_user: User = Depends(get_current_user)):
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    user = await User.find_one(User.email == payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    from app.models.project import ProjectMember
    # Upsert
    members = project.members or []
    for m in members:
        if str(m.user_id) == str(user.id):
            m.role = payload.role or m.role
            await project.save()
            return project
    members.append(ProjectMember(user_id=user.id, role=payload.role or "contributor"))
    project.members = members
    await project.save()
    return project


@router.patch("/{project_id}/members/{user_id}", response_model=ProjectOut)
async def update_project_member(project_id: str, user_id: str, role: str, current_user: User = Depends(get_current_user)):
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    updated = False
    for m in project.members or []:
        if str(m.user_id) == user_id:
            m.role = role
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Member not found")
    await project.save()
    return project


@router.delete("/{project_id}/members/{user_id}", response_model=ProjectOut)
async def remove_project_member(project_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    before = len(project.members or [])
    project.members = [m for m in (project.members or []) if str(m.user_id) != user_id]
    if len(project.members) == before:
        raise HTTPException(status_code=404, detail="Member not found")
    await project.save()
    return project


@router.post("/{project_id}/repos/{repo_id}/unlink", response_model=ProjectOut)
async def unlink_project_repo(project_id: str, repo_id: str, current_user: User = Depends(get_current_user)):
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    repo_ids = project.repo_ids or []
    if repo_id not in repo_ids:
        raise HTTPException(status_code=404, detail="Repo not linked to project")
    repo_ids = [rid for rid in repo_ids if rid != repo_id]
    project.repo_ids = repo_ids
    if project.default_repo_id == repo_id:
        project.default_repo_id = None
    await project.save()
    return project


@router.post("/{project_id}/repos/{repo_id}/set-default", response_model=ProjectOut)
async def set_default_project_repo(project_id: str, repo_id: str, current_user: User = Depends(get_current_user)):
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    repo_ids = project.repo_ids or []
    if repo_id not in repo_ids:
        repo_ids.append(repo_id)
    project.repo_ids = repo_ids
    project.default_repo_id = repo_id
    await project.save()
    return project


@router.post("/", response_model=ProjectOut)
async def create_project(payload: ProjectCreate, current_user: User = Depends(get_current_user)):
    project = Project(name=payload.name, status=payload.status or "active", repo_ids=payload.repo_ids)
    await project.insert()
    return project


@router.get("/", response_model=List[ProjectOut])
async def list_projects(current_user: User = Depends(get_current_user)):
    return await Project.find_all().sort(-Project.created_at).to_list()


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, payload: ProjectUpdate, current_user: User = Depends(get_current_user)):
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(project, field, value)
    await project.save()
    return project
