from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.allocation_strategy import AllocationStrategy


class AllocationStrategyRepository:
    """Repository for allocation strategy operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, strategy: AllocationStrategy) -> AllocationStrategy:
        """Create a new allocation strategy."""
        self.db.add(strategy)
        await self.db.flush()
        await self.db.refresh(strategy)
        return strategy

    async def get_by_id(
        self,
        strategy_id: int,
        tenant_id: int,
    ) -> Optional[AllocationStrategy]:
        """Get allocation strategy by ID."""
        stmt = select(AllocationStrategy).where(
            AllocationStrategy.id == strategy_id,
            AllocationStrategy.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_strategies(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True
    ) -> List[AllocationStrategy]:
        """List allocation strategies."""
        stmt = select(AllocationStrategy).where(
            AllocationStrategy.tenant_id == tenant_id
        )

        if active_only:
            stmt = stmt.where(AllocationStrategy.is_active == True)

        stmt = stmt.offset(skip).limit(limit).order_by(AllocationStrategy.name)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, strategy: AllocationStrategy) -> AllocationStrategy:
        """Update an allocation strategy."""
        await self.db.flush()
        await self.db.refresh(strategy)
        return strategy

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
