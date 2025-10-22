from fastapi import APIRouter, Depends

from app.api.routes import auth, users, candidates, roles, forms, projects, xp, integrations_github, forms_public
from app.api.deps import get_current_user

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/v1")
api_router.include_router(users.router, prefix="/v1")
api_router.include_router(candidates.router, prefix="/v1", dependencies=[Depends(get_current_user)])
api_router.include_router(roles.router, prefix="/v1", dependencies=[Depends(get_current_user)])
api_router.include_router(forms.router, prefix="/v1", dependencies=[Depends(get_current_user)])
api_router.include_router(projects.router, prefix="/v1", dependencies=[Depends(get_current_user)])
api_router.include_router(xp.router, prefix="/v1", dependencies=[Depends(get_current_user)])
api_router.include_router(integrations_github.router, prefix="/v1")
api_router.include_router(forms_public.router, prefix="/v1/public")
