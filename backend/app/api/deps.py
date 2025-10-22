from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from beanie import PydanticObjectId

from app.core.config import settings
from app.models import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub: str | None = payload.get("sub")  # type: ignore
        if not sub:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    print(f"get_current_user called with sub: {sub}")
    
    # Retrieve user by email
    user = await User.find_one(User.email == sub)
    
    print(f"User found: {user is not None}")
    if user:
        print(f"User email: {user.email}")
        print(f"User ID: {user.id}")
    
    if not user:
        raise credentials_exception
    
    return user
