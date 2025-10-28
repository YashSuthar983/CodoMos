from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from typing import List, Dict, Any

from app.models import User, XPEvent, Project
from app.schemas.user import UserOut, UserUpdate
from app.core.config import settings
from jose import jwt, JWTError
from beanie import PydanticObjectId
from app.api.deps import get_current_user

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")

router = APIRouter(prefix="/users", tags=["users"])


async def get_current_user_manual(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub: str | None = payload.get("sub")
        if not sub:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await User.find_one(User.email == sub)
    if not user:
        raise credentials_exception

    return user


@router.get("/me", response_model=UserOut)
async def read_users_me(request: Request):
    # Extract token manually
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.split(" ")[1]

    # Validate token
    user = await get_current_user_manual(token)

    return user


@router.patch("/me", response_model=UserOut)
async def update_me(payload: UserUpdate, request: Request):
    # Extract token manually
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.split(" ")[1]

    # Validate token
    current_user = await get_current_user_manual(token)

    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.role is not None:
        current_user.role = payload.role
    if payload.github_username is not None:
        current_user.github_username = payload.github_username
    if payload.github_pat is not None:
        # Empty string clears the PAT
        current_user.github_pat = payload.github_pat or None
    await current_user.save()
    return current_user


async def _get_user_by_id_any(user_id: str) -> User | None:
    """Fetch user by matching ID as string - workaround for bson_encoders issue."""
    # Due to User model having bson_encoders={ObjectId: str}, we need to 
    # fetch all users and match by string comparison
    all_users = await User.find_all().to_list()
    for user in all_users:
        if str(user.id) == str(user_id):
            return user
    return None

@router.get("/", response_model=List[UserOut])
async def list_users(current_user: User = Depends(get_current_user)):
    """List all users for employee management and team member selection"""
    users = await User.find_all().sort(-User.created_at).to_list()
    return users


@router.get("/leaderboard/organization")
async def get_organization_leaderboard(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Get organization-wide XP leaderboard with all user details"""
    # Get all active users
    all_users = await User.find(User.is_active == True).to_list()
    
    # Calculate XP for each user
    leaderboard_data = []
    for user in all_users:
        xp_events = await XPEvent.find(XPEvent.person_id == user.id).to_list()
        total_xp = sum(event.amount for event in xp_events)
        
        # Get project count
        projects = await Project.find().to_list()
        user_projects = [
            p for p in projects 
            if any(str(m.user_id) == str(user.id) for m in p.members)
        ]
        
        # Calculate XP by skill
        xp_by_skill = {}
        for event in xp_events:
            if event.skill_distribution:
                for skill, amount in event.skill_distribution.items():
                    xp_by_skill[skill] = xp_by_skill.get(skill, 0) + amount
        
        leaderboard_data.append({
            "user_id": str(user.id),
            "full_name": user.full_name or "Unknown",
            "email": user.email,
            "position": user.position or "Employee",
            "github_username": user.github_username,
            "role": user.role,
            "total_xp": total_xp,
            "project_count": len(user_projects),
            "xp_events_count": len(xp_events),
            "top_skill": max(xp_by_skill.items(), key=lambda x: x[1])[0] if xp_by_skill else None,
            "top_skill_xp": max(xp_by_skill.values()) if xp_by_skill else 0
        })
    
    # Sort by total XP descending
    leaderboard_data.sort(key=lambda x: x["total_xp"], reverse=True)
    
    # Add rank
    for idx, entry in enumerate(leaderboard_data, 1):
        entry["rank"] = idx
    
    return {
        "leaderboard": leaderboard_data,
        "total_users": len(leaderboard_data),
        "total_xp": sum(entry["total_xp"] for entry in leaderboard_data)
    }


@router.get("/{user_id}/profile")
async def get_user_profile(user_id: str, current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Get user profile with XP stats and project involvement"""
    target_user = await _get_user_by_id_any(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get total XP
    xp_events = await XPEvent.find(XPEvent.person_id == target_user.id).to_list()
    total_xp = sum(event.amount for event in xp_events)
    
    # Get project count (projects where user is a member)
    projects = await Project.find().to_list()
    user_projects = [
        p for p in projects 
        if any(str(m.user_id) == str(target_user.id) for m in p.members)
    ]
    
    # Get recent XP events (last 10)
    recent_xp = await XPEvent.find(
        XPEvent.person_id == target_user.id
    ).sort(-XPEvent.created_at).limit(10).to_list()
    
    # Calculate XP by skill
    xp_by_skill = {}
    for event in xp_events:
        if event.skill_distribution:
            for skill, amount in event.skill_distribution.items():
                xp_by_skill[skill] = xp_by_skill.get(skill, 0) + amount
    
    return {
        "user": UserOut(
            id=str(target_user.id),
            email=target_user.email,
            full_name=target_user.full_name,
            role=target_user.role,
            position=target_user.position,
            github_username=target_user.github_username,
            is_active=target_user.is_active
        ),
        "stats": {
            "total_xp": total_xp,
            "project_count": len(user_projects),
            "xp_events_count": len(xp_events),
            "xp_by_skill": xp_by_skill
        },
        "projects": [
            {
                "id": str(p.id),
                "name": p.name,
                "role": next((m.role for m in p.members if str(m.user_id) == user_id), "member")
            }
            for p in user_projects
        ],
        "recent_xp": [
            {
                "id": str(event.id),
                "source": event.source,
                "amount": event.amount,
                "created_at": event.created_at.isoformat() if event.created_at else None
            }
            for event in recent_xp
        ]
    }


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(user_id: str, payload: UserUpdate, current_user: User = Depends(get_current_user)):
    """Update a user (admin only or self)"""
    target_user = await _get_user_by_id_any(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permissions: admin can edit anyone, users can only edit themselves
    if current_user.role != "admin" and str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    # Update fields
    if payload.full_name is not None:
        target_user.full_name = payload.full_name
    if payload.role is not None:
        # Only admins can change roles
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can change user roles")
        target_user.role = payload.role
    if payload.position is not None:
        target_user.position = payload.position
    if payload.github_username is not None:
        target_user.github_username = payload.github_username
    if payload.github_pat is not None:
        target_user.github_pat = payload.github_pat or None
    if payload.is_active is not None:
        # Only admins can activate/deactivate users
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can change user status")
        target_user.is_active = payload.is_active
    
    await target_user.save()
    return target_user
