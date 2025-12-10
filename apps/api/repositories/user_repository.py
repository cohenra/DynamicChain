from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.user import User
from repositories.base_repository import BaseRepository

class UserRepository(BaseRepository[User]):
    """Repository for User database operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, User)

    async def get_by_id(self, user_id: int) -> Optional[User]:
        """Get a user by ID (Override to allow lookup without tenant_id context if needed)."""
        # User lookup is often done by ID globally or during auth where tenant might not be known yet contextually
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get a user by email."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()