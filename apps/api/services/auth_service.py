from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from auth.utils import verify_password, create_access_token, hash_password
from repositories.user_repository import UserRepository
from schemas.auth import LoginRequest, LoginResponse
from schemas.user import UserCreate
from models.user import User


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def login(self, login_data: LoginRequest) -> LoginResponse:
        """Authenticate a user and return access token with warehouse context."""
        # Get user by email
        user = await self.user_repo.get_by_email(login_data.email)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Fetch the first available warehouse for the tenant
        from repositories.warehouse_repository import WarehouseRepository
        warehouse_repo = WarehouseRepository(self.db)
        warehouses = await warehouse_repo.list_warehouses(tenant_id=user.tenant_id, skip=0, limit=1)
        warehouse_id = warehouses[0].id if warehouses else None

        # Create access token
        token_data = {
            "user_id": user.id,
            "tenant_id": user.tenant_id,
            "email": user.email,
            "role": user.role.value
        }
        access_token = create_access_token(token_data)

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            tenant_id=user.tenant_id,
            role=user.role.value,
            warehouse_id=warehouse_id # <-- הוסף
        )

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with hashed password."""
        # Check if user already exists
        existing_user = await self.user_repo.get_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create user with hashed password
        user = User(
            tenant_id=user_data.tenant_id,
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            role=user_data.role,
            full_name=user_data.full_name
        )

        return await self.user_repo.create(user)