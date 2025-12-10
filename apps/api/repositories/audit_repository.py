from typing import Optional, List
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.system_audit_log import SystemAuditLog
from repositories.base_repository import BaseRepository

class AuditRepository(BaseRepository[SystemAuditLog]):
    """
    Repository for SystemAuditLog database operations.
    IMPORTANT: This is an append-only audit log.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(db, SystemAuditLog)

    async def get_by_id(self, log_id: int, tenant_id: int) -> Optional[SystemAuditLog]:
        """Get an audit log by ID with tenant isolation."""
        return await super().get_by_id(
            id=log_id,
            tenant_id=tenant_id,
            options=[
                selectinload(SystemAuditLog.user),
                selectinload(SystemAuditLog.tenant)
            ]
        )

    async def list_logs(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[SystemAuditLog]:
        """List audit logs with optional filters."""
        filters = []
        if entity_type: filters.append(SystemAuditLog.entity_type == entity_type)
        if entity_id: filters.append(SystemAuditLog.entity_id == entity_id)
        if user_id: filters.append(SystemAuditLog.user_id == user_id)
        if action: filters.append(SystemAuditLog.action == action)
        if start_date: filters.append(SystemAuditLog.timestamp >= start_date)
        if end_date: filters.append(SystemAuditLog.timestamp <= end_date)

        options = [
            selectinload(SystemAuditLog.user),
            selectinload(SystemAuditLog.tenant)
        ]

        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=filters,
            options=options,
            order_by=SystemAuditLog.timestamp.desc()
        )

    async def count(
        self,
        tenant_id: int,
        entity_type: Optional[str] = None,
        user_id: Optional[int] = None,
        action: Optional[str] = None
    ) -> int:
        """Count audit logs with optional filters."""
        filters = []
        if entity_type: filters.append(SystemAuditLog.entity_type == entity_type)
        if user_id: filters.append(SystemAuditLog.user_id == user_id)
        if action: filters.append(SystemAuditLog.action == action)

        return await super().count(tenant_id=tenant_id, filters=filters)

    async def get_entity_history(
        self,
        entity_type: str,
        entity_id: int,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[SystemAuditLog]:
        """Get complete history for a specific entity."""
        filters = [
            SystemAuditLog.entity_type == entity_type,
            SystemAuditLog.entity_id == entity_id
        ]
        
        options = [
            selectinload(SystemAuditLog.user),
            selectinload(SystemAuditLog.tenant)
        ]

        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=filters,
            options=options,
            order_by=SystemAuditLog.timestamp.desc()
        )