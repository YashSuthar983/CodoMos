from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer

from app.models import User
from app.schemas.user import UserOut, UserUpdate
from app.core.config import settings
from jose import jwt, JWTError
from beanie import PydanticObjectId

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
        print(f"Decoded sub from token: {sub}")
        if not sub:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await User.find_one(User.email == sub)
    print(f"User found by email: {user is not None}")
    
    if not user:
        raise credentials_exception
    
    return user


@router.get("/me", response_model=UserOut)
async def read_users_me(request: Request):
    # Extract token manually
    auth_header = request.headers.get("Authorization")
    print(f"Authorization header: {auth_header}")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    print(f"Extracted token: {token}")
    
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
    await current_user.save()
    return current_user
