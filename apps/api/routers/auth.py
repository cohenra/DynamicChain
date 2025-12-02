from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.auth import LoginRequest, LoginResponse
from schemas.user import UserCreate, UserResponse
from services.auth_service import AuthService


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> LoginResponse:
    """
    Login endpoint to authenticate users and return JWT token.

    Args:
        login_data: User credentials (email and password)
        db: Database session

    Returns:
        LoginResponse with access token and user information
    """
    auth_service = AuthService(db)
    return await auth_service.login(login_data)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    Register a new user.

    Args:
        user_data: New user information
        db: Database session

    Returns:
        UserResponse with created user information
    """
    auth_service = AuthService(db)
    user = await auth_service.create_user(user_data)
    return UserResponse.model_validate(user)
