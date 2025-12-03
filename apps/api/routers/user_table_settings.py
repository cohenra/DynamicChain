from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.user_table_setting import UserTableSettingCreate, UserTableSettingUpdate, UserTableSettingResponse
from services.user_table_setting_service import UserTableSettingService
from auth.dependencies import get_current_user
from models.user import User


router = APIRouter(prefix="/api/user-table-settings", tags=["User Table Settings"])


@router.put("/{table_name}", response_model=UserTableSettingResponse, status_code=status.HTTP_200_OK)
async def create_or_update_table_setting(
    table_name: str,
    setting_data: UserTableSettingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UserTableSettingResponse:
    """
    Create or update a table setting for the current user.

    If a setting for this table already exists, it will be updated.
    Otherwise, a new setting will be created.

    Args:
        table_name: Name of the table (e.g., 'locations', 'products')
        setting_data: Settings JSON containing column order, visibility, page size, etc.
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        UserTableSettingResponse: Created or updated table setting

    Raises:
        401: If user is not authenticated
    """
    service = UserTableSettingService(db)
    setting = await service.create_or_update_setting(
        table_name=table_name,
        settings_json=setting_data.settings_json,
        user_id=current_user.id
    )
    return UserTableSettingResponse.model_validate(setting)


@router.get("/{table_name}", response_model=Optional[UserTableSettingResponse])
async def get_table_setting(
    table_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Optional[UserTableSettingResponse]:
    """
    Get a table setting for the current user by table name.

    Args:
        table_name: Name of the table
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        UserTableSettingResponse: Table setting or None if not found

    Raises:
        401: If user is not authenticated
    """
    service = UserTableSettingService(db)
    setting = await service.get_setting(
        table_name=table_name,
        user_id=current_user.id
    )
    if setting:
        return UserTableSettingResponse.model_validate(setting)
    return None


@router.get("/", response_model=List[UserTableSettingResponse])
async def list_table_settings(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[UserTableSettingResponse]:
    """
    List all table settings for the authenticated user.

    Supports pagination via skip and limit parameters.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[UserTableSettingResponse]: List of table settings for this user

    Raises:
        401: If user is not authenticated
    """
    service = UserTableSettingService(db)
    settings = await service.list_settings(
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    return [UserTableSettingResponse.model_validate(setting) for setting in settings]


@router.delete("/{table_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table_setting(
    table_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a table setting for the current user.

    Args:
        table_name: Name of the table
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        None: 204 No Content on success

    Raises:
        401: If user is not authenticated
        404: If table setting not found
    """
    service = UserTableSettingService(db)
    await service.delete_setting(
        table_name=table_name,
        user_id=current_user.id
    )
