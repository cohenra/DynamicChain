from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.inbound_line import InboundLine


class InboundLineRepository:
    """Repository for inbound line operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, line: InboundLine) -> InboundLine:
        """Create a new inbound line."""
        self.db.add(line)
        await self.db.flush()
        await self.db.refresh(line)
        return line

    async def get_by_id(
        self,
        line_id: int
    ) -> Optional[InboundLine]:
        """Get inbound line by ID."""
        stmt = select(InboundLine).where(InboundLine.id == line_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_order(
        self,
        inbound_order_id: int
    ) -> List[InboundLine]:
        """List all lines for an inbound order."""
        stmt = (
            select(InboundLine)
            .where(InboundLine.inbound_order_id == inbound_order_id)
            .order_by(InboundLine.id)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, line: InboundLine) -> InboundLine:
        """Update an inbound line."""
        await self.db.flush()
        await self.db.refresh(line)
        return line

    async def delete(self, line: InboundLine) -> None:
        """Delete an inbound line."""
        await self.db.delete(line)
        await self.db.flush()
