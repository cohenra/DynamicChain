from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.user_table_setting import UserTableSetting


class UserTableSettingRepository:
    """Repository for UserTableSetting database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, setting: UserTableSetting) -> UserTableSetting:
        """Create a new user table setting."""
        self.db.add(setting)
        await self.db.flush()
        await self.db.refresh(setting)
        return setting

    async def get_by_id(self, setting_id: int, user_id: int) -> Optional[UserTableSetting]:
        """Get a user table setting by ID with user isolation."""
        result = await self.db.execute(
            select(UserTableSetting).where(
                and_(
                    UserTableSetting.id == setting_id,
                    UserTableSetting.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_table_name(self, table_name: str, user_id: int) -> Optional[UserTableSetting]:
        """Get a user table setting by table name for a specific user."""
        result = await self.db.execute(
            select(UserTableSetting).where(
                and_(
                    UserTableSetting.table_name == table_name,
                    UserTableSetting.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_settings(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[UserTableSetting]:
        """List all table settings for a user with pagination."""
        query = select(UserTableSetting).where(UserTableSetting.user_id == user_id)
        query = query.offset(skip).limit(limit).order_by(UserTableSetting.table_name)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(self, setting: UserTableSetting) -> UserTableSetting:
        """Update an existing user table setting."""
        await self.db.flush()
        await self.db.refresh(setting)
        return setting

    async def delete(self, setting: UserTableSetting) -> None:
        """Delete a user table setting."""
        await self.db.delete(setting)
        await self.db.flush()
