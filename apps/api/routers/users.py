from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.user import UserCreate, UserResponse
from repositories.user_repository import UserRepository
from auth.dependencies import get_current_user
from auth.utils import get_password_hash
from models.user import User

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Retrieve users.
    """
    repo = UserRepository(db)
    # Fallback mechanism for repository methods
    if hasattr(repo, 'get_multi'):
        return await repo.get_multi(skip=skip, limit=limit)
    return await repo.get_all(skip=skip, limit=limit)

@router.post("/", response_model=UserResponse)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    # current_user: User = Depends(get_current_user) # Uncomment if restricted
) -> Any:
    """
    Create new user.
    """
    repo = UserRepository(db)
    user = await repo.get_by_email(email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Create dict and hash password
    user_data = user_in.model_dump()
    user_data["password"] = get_password_hash(user_in.password)
    
    user = await repo.create(obj_in=user_data)
    return user

@router.get("/{user_id}", response_model=UserResponse)
async def read_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get a specific user by id.
    """
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )
    return user