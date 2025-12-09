from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.outbound_line import OutboundLine

class OutboundLineRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, line: OutboundLine) -> OutboundLine:
        self.db.add(line)
        await self.db.flush()
        await self.db.refresh(line)
        return line

    async def get_by_id(self, line_id: int) -> Optional[OutboundLine]:
        query = select(OutboundLine).where(OutboundLine.id == line_id).options(
            selectinload(OutboundLine.product),
            selectinload(OutboundLine.uom)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update(self, line: OutboundLine) -> OutboundLine:
        await self.db.flush()
        await self.db.refresh(line)
        return line
    
    async def delete(self, line: OutboundLine):
        await self.db.delete(line)
        await self.db.flush()