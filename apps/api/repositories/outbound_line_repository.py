from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.outbound_line import OutboundLine


class OutboundLineRepository:
    """Repository for outbound line operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, line: OutboundLine) -> OutboundLine:
        """Create a new outbound line."""
        self.db.add(line)
        await self.db.flush()
        await self.db.refresh(line)
        return line

    async def get_by_id(
        self,
        line_id: int,
    ) -> Optional[OutboundLine]:
        """Get outbound line by ID with relationships."""
        stmt = (
            select(OutboundLine)
            .where(OutboundLine.id == line_id)
            .options(
                selectinload(OutboundLine.pick_tasks)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_order(
        self,
        order_id: int,
    ) -> List[OutboundLine]:
        """List all lines for a specific order."""
        stmt = (
            select(OutboundLine)
            .where(OutboundLine.order_id == order_id)
            .options(
                selectinload(OutboundLine.pick_tasks)
            )
            .order_by(OutboundLine.created_at)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, line: OutboundLine) -> OutboundLine:
        """Update an outbound line."""
        await self.db.flush()
        await self.db.refresh(line)
        return line
