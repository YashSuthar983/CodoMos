from fastapi import APIRouter, Depends, HTTPException
from typing import List
from beanie import PydanticObjectId

from app.api.deps import get_current_user
from app.models import Repo, Project, User
from app.schemas.project import RepoCreate, RepoOut, RepoUpdate, ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/repos", response_model=RepoOut)
async def create_repo(payload: RepoCreate, current_user: User = Depends(get_current_user)):
    repo = Repo(provider=payload.provider or "github", external_id=payload.external_id, name=payload.name, webhook_secret=payload.webhook_secret, tags=payload.tags)
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


@router.post("/", response_model=ProjectOut)
async def create_project(payload: ProjectCreate, current_user: User = Depends(get_current_user)):
    project = Project(name=payload.name, status=payload.status or "active", repo_ids=payload.repo_ids)
    await project.insert()
    return project


@router.get("/", response_model=List[ProjectOut])
async def list_projects(current_user: User = Depends(get_current_user)):
    return await Project.find_all().sort(-Project.created_at).to_list()


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, payload: ProjectUpdate, current_user: User = Depends(get_current_user)):
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(project, field, value)
    await project.save()
    return project
