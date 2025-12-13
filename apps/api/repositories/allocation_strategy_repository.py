from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.allocation_strategy import AllocationStrategy, WaveType
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

    async def get_by_wave_type(
        self,
        wave_type: WaveType,
        tenant_id: int
    ) -> Optional[AllocationStrategy]:
        """Get strategy by wave type (unique per tenant)."""
        stmt = select(AllocationStrategy).where(
            AllocationStrategy.wave_type == wave_type,
            AllocationStrategy.tenant_id == tenant_id,
            AllocationStrategy.is_active == True
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_available_wave_types(
        self,
        tenant_id: int
    ) -> List[AllocationStrategy]:
        """
        List all strategies that have a wave_type configured.
        This returns strategies that users can select for wave creation.
        """
        stmt = select(AllocationStrategy).where(
            AllocationStrategy.tenant_id == tenant_id,
            AllocationStrategy.is_active == True,
            AllocationStrategy.wave_type.isnot(None)
        ).order_by(AllocationStrategy.name)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())