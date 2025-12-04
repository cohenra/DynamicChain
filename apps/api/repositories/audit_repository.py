from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.system_audit_log import SystemAuditLog


class AuditRepository:
    """
    Repository for SystemAuditLog database operations.

    IMPORTANT: This is an append-only audit log. NEVER delete audit records.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, audit_log: SystemAuditLog) -> SystemAuditLog:
        """
        Create a new audit log entry.

        This is the only write operation - audit logs are immutable.
        """
        self.db.add(audit_log)
        await self.db.flush()
        await self.db.refresh(audit_log)
        return await self.get_by_id(audit_log.id, audit_log.tenant_id)

    async def get_by_id(self, log_id: int, tenant_id: int) -> Optional[SystemAuditLog]:
        """Get an audit log by ID with tenant isolation."""
        result = await self.db.execute(
            select(SystemAuditLog)
            .options(
                selectinload(SystemAuditLog.user),
                selectinload(SystemAuditLog.tenant)
            )
            .where(
                and_(
                    SystemAuditLog.id == log_id,
                    SystemAuditLog.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

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
        query = select(SystemAuditLog).options(
            selectinload(SystemAuditLog.user),
            selectinload(SystemAuditLog.tenant)
        ).where(SystemAuditLog.tenant_id == tenant_id)

        # Apply filters
        if entity_type is not None:
            query = query.where(SystemAuditLog.entity_type == entity_type)
        if entity_id is not None:
            query = query.where(SystemAuditLog.entity_id == entity_id)
        if user_id is not None:
            query = query.where(SystemAuditLog.user_id == user_id)
        if action is not None:
            query = query.where(SystemAuditLog.action == action)
        if start_date is not None:
            query = query.where(SystemAuditLog.timestamp >= start_date)
        if end_date is not None:
            query = query.where(SystemAuditLog.timestamp <= end_date)

        query = query.offset(skip).limit(limit).order_by(SystemAuditLog.timestamp.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_entity_history(
        self,
        entity_type: str,
        entity_id: int,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[SystemAuditLog]:
        """Get complete history for a specific entity."""
        result = await self.db.execute(
            select(SystemAuditLog)
            .options(
                selectinload(SystemAuditLog.user),
                selectinload(SystemAuditLog.tenant)
            )
            .where(
                and_(
                    SystemAuditLog.entity_type == entity_type,
                    SystemAuditLog.entity_id == entity_id,
                    SystemAuditLog.tenant_id == tenant_id
                )
            )
            .offset(skip)
            .limit(limit)
            .order_by(SystemAuditLog.timestamp.desc())
        )
        return list(result.scalars().all())

    async def count(
        self,
        tenant_id: int,
        entity_type: Optional[str] = None,
        user_id: Optional[int] = None,
        action: Optional[str] = None
    ) -> int:
        """Count audit logs with optional filters."""
        from sqlalchemy import func

        query = select(func.count(SystemAuditLog.id)).where(
            SystemAuditLog.tenant_id == tenant_id
        )

        if entity_type is not None:
            query = query.where(SystemAuditLog.entity_type == entity_type)
        if user_id is not None:
            query = query.where(SystemAuditLog.user_id == user_id)
        if action is not None:
            query = query.where(SystemAuditLog.action == action)

        result = await self.db.execute(query)
        return result.scalar_one()
