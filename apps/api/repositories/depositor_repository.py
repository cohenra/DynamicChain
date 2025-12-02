from typing import Optional, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from models.depositor import Depositor


class DepositorRepository:
    """Repository for Depositor database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, depositor: Depositor) -> Depositor:
        """Create a new depositor."""
        self.db.add(depositor)
        await self.db.flush()
        await self.db.refresh(depositor)
        return depositor

    async def get_by_id(self, depositor_id: int, tenant_id: int) -> Optional[Depositor]:
        """Get a depositor by ID with tenant isolation."""
        result = await self.db.execute(
            select(Depositor).where(
                and_(
                    Depositor.id == depositor_id,
                    Depositor.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str, tenant_id: int) -> Optional[Depositor]:
        """Get a depositor by code within a tenant."""
        result = await self.db.execute(
            select(Depositor).where(
                and_(
                    Depositor.code == code,
                    Depositor.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_depositors(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Depositor]:
        """List all depositors for a tenant with pagination."""
        result = await self.db.execute(
            select(Depositor)
            .where(Depositor.tenant_id == tenant_id)
            .offset(skip)
            .limit(limit)
            .order_by(Depositor.created_at.desc())
        )
        return list(result.scalars().all())

    async def count(self, tenant_id: int) -> int:
        """Count total depositors for a tenant."""
        result = await self.db.execute(
            select(func.count(Depositor.id)).where(Depositor.tenant_id == tenant_id)
        )
        return result.scalar_one()

    async def update(self, depositor: Depositor) -> Depositor:
        """Update an existing depositor."""
        await self.db.flush()
        await self.db.refresh(depositor)
        return depositor

    async def delete(self, depositor: Depositor) -> None:
        """Delete a depositor."""
        await self.db.delete(depositor)
        await self.db.flush()
