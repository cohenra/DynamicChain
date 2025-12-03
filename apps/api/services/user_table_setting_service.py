from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.user_table_setting_repository import UserTableSettingRepository
from schemas.user_table_setting import UserTableSettingCreate, UserTableSettingUpdate
from models.user_table_setting import UserTableSetting


class UserTableSettingService:
    """Service for user table setting business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.setting_repo = UserTableSettingRepository(db)

    async def create_or_update_setting(
        self,
        table_name: str,
        settings_json: Dict[str, Any],
        user_id: int
    ) -> UserTableSetting:
        """
        Create or update a user table setting.

        If a setting already exists for the user and table, it updates it.
        Otherwise, it creates a new one.

        Args:
            table_name: Name of the table
            settings_json: Settings JSON object
            user_id: ID of the user

        Returns:
            Created or updated UserTableSetting instance
        """
        # Check if setting already exists
        existing_setting = await self.setting_repo.get_by_table_name(
            table_name=table_name,
            user_id=user_id
        )

        if existing_setting:
            # Update existing setting
            existing_setting.settings_json = settings_json
            return await self.setting_repo.update(existing_setting)
        else:
            # Create new setting
            setting = UserTableSetting(
                user_id=user_id,
                table_name=table_name,
                settings_json=settings_json
            )
            return await self.setting_repo.create(setting)

    async def get_setting(
        self,
        table_name: str,
        user_id: int
    ) -> Optional[UserTableSetting]:
        """
        Get a user table setting by table name.

        Args:
            table_name: Name of the table
            user_id: ID of the user

        Returns:
            UserTableSetting instance or None if not found
        """
        return await self.setting_repo.get_by_table_name(
            table_name=table_name,
            user_id=user_id
        )

    async def list_settings(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[UserTableSetting]:
        """
        List all table settings for a user with pagination.

        Args:
            user_id: ID of the user
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of UserTableSetting instances
        """
        return await self.setting_repo.list_settings(
            user_id=user_id,
            skip=skip,
            limit=limit
        )

    async def delete_setting(
        self,
        table_name: str,
        user_id: int
    ) -> None:
        """
        Delete a user table setting.

        Args:
            table_name: Name of the table
            user_id: ID of the user

        Raises:
            HTTPException: If setting not found
        """
        setting = await self.setting_repo.get_by_table_name(
            table_name=table_name,
            user_id=user_id
        )

        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table setting for '{table_name}' not found"
            )

        await self.setting_repo.delete(setting)
