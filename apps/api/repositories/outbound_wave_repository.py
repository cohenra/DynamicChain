from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.outbound_wave import OutboundWave, OutboundWaveStatus
from models.outbound_order import OutboundOrder


class OutboundWaveRepository:
    """Repository for outbound wave operations with proper eager loading."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, wave: OutboundWave) -> OutboundWave:
        """Create a new outbound wave."""
        self.db.add(wave)
        await self.db.flush()
        await self.db.refresh(wave)
        return wave

    async def get_by_id(
        self,
        wave_id: int,
        tenant_id: int,
    ) -> Optional[OutboundWave]:
        """
        Get outbound wave by ID with ALL relationships eagerly loaded.
        This ensures no N+1 queries.
        """
        stmt = (
            select(OutboundWave)
            .where(
                OutboundWave.id == wave_id,
                OutboundWave.tenant_id == tenant_id
            )
            .options(
                # Load orders
                selectinload(OutboundWave.orders)
                .selectinload(OutboundOrder.lines),
                # Load pick tasks
                selectinload(OutboundWave.pick_tasks)
            )
        )

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_waves(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OutboundWaveStatus] = None
    ) -> List[OutboundWave]:
        """
        List outbound waves with ALL relationships eagerly loaded.
        This is critical to avoid N+1 queries in list views.
        """
        stmt = (
            select(OutboundWave)
            .where(OutboundWave.tenant_id == tenant_id)
        )

        if status:
            stmt = stmt.where(OutboundWave.status == status)

        # CRITICAL: Eager load ALL relationships
        stmt = stmt.options(
            selectinload(OutboundWave.orders),
            selectinload(OutboundWave.pick_tasks)
        )

        stmt = stmt.offset(skip).limit(limit).order_by(OutboundWave.created_at.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, wave: OutboundWave) -> OutboundWave:
        """Update an outbound wave."""
        await self.db.flush()
        await self.db.refresh(wave)
        return wave

    async def get_by_wave_number(
        self,
        wave_number: str,
        tenant_id: int
    ) -> Optional[OutboundWave]:
        """Get wave by wave number."""
        stmt = select(OutboundWave).where(
            OutboundWave.wave_number == wave_number,
            OutboundWave.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
