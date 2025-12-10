from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.depositor import Depositor
from repositories.base_repository import BaseRepository


class DepositorRepository(BaseRepository[Depositor]):
    """Repository for Depositor database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, Depositor)

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
    ):
        """List all depositors for a tenant with pagination."""
        return await self.list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit
        )
