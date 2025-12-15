from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.outbound_wave import OutboundWave
from models.outbound_order import OutboundOrder
from models.outbound_line import OutboundLine
from models.pick_task import PickTask  # Ensure PickTask is imported
from repositories.base_repository import BaseRepository

class OutboundWaveRepository(BaseRepository[OutboundWave]):
    """Repository for Outbound Wave operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, OutboundWave)

    async def get_by_id(self, id: int, tenant_id: int) -> Optional[OutboundWave]:
        """Get wave with full relationship loading."""
        stmt = (
            select(OutboundWave)
            .options(
                # Load Orders, their Customers, and their Lines (for counts)
                selectinload(OutboundWave.orders).selectinload(OutboundOrder.customer),
                selectinload(OutboundWave.orders).selectinload(OutboundOrder.lines),
                # Load Pick Tasks
                selectinload(OutboundWave.pick_tasks)
            )
            .where(
                and_(
                    OutboundWave.id == id,
                    OutboundWave.tenant_id == tenant_id
                )
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_waves(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[OutboundWave]:
        """List waves with optimized loading for dashboard counters."""
        stmt = select(OutboundWave).where(OutboundWave.tenant_id == tenant_id)

        if status:
            stmt = stmt.where(OutboundWave.status == status)

        # Optimize loading for table display - CRITICAL for "View Orders" to work
        stmt = stmt.options(
            selectinload(OutboundWave.orders).selectinload(OutboundOrder.lines),
            selectinload(OutboundWave.orders).selectinload(OutboundOrder.customer),
            selectinload(OutboundWave.pick_tasks)
        ).order_by(OutboundWave.created_at.desc())

        stmt = stmt.offset(skip).limit(limit)
        
        result = await self.db.execute(stmt)
        return list(result.scalars().all())