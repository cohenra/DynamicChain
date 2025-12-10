from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.allocation_strategy import AllocationStrategy
from repositories.base_repository import BaseRepository

class AllocationStrategyRepository(BaseRepository[AllocationStrategy]):
    """Repository for allocation strategy operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, AllocationStrategy)

    async def list_strategies(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True
    ) -> List[AllocationStrategy]:
        """List allocation strategies with custom filtering."""
        stmt = select(AllocationStrategy).where(
            AllocationStrategy.tenant_id == tenant_id
        )

        if active_only:
            stmt = stmt.where(AllocationStrategy.is_active == True)

        stmt = stmt.offset(skip).limit(limit).order_by(AllocationStrategy.name)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_name(
        self,
        name: str,
        tenant_id: int
    ) -> Optional[AllocationStrategy]:
        """Get strategy by name."""
        stmt = select(AllocationStrategy).where(
            AllocationStrategy.name == name,
            AllocationStrategy.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()