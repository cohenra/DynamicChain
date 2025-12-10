from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.outbound_wave import OutboundWave, OutboundWaveStatus
from models.outbound_order import OutboundOrder
from repositories.base_repository import BaseRepository

class OutboundWaveRepository(BaseRepository[OutboundWave]):
    """Repository for outbound wave operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, OutboundWave)

    async def get_by_id(self, id: int, tenant_id: int) -> Optional[OutboundWave]:
        return await super().get_by_id(
            id=id,
            tenant_id=tenant_id,
            options=[
                selectinload(OutboundWave.orders).selectinload(OutboundOrder.lines),
                selectinload(OutboundWave.pick_tasks)
            ]
        )

    async def list_waves(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OutboundWaveStatus] = None
    ) -> List[OutboundWave]:
        
        filters = []
        if status: filters.append(OutboundWave.status == status)

        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=filters,
            options=[
                selectinload(OutboundWave.orders),
                selectinload(OutboundWave.pick_tasks)
            ],
            order_by=OutboundWave.created_at.desc()
        )

    async def get_by_wave_number(self, wave_number: str, tenant_id: int) -> Optional[OutboundWave]:
        stmt = select(OutboundWave).where(
            OutboundWave.wave_number == wave_number,
            OutboundWave.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()