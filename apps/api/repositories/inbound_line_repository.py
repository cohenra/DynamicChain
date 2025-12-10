from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.inbound_line import InboundLine
from repositories.base_repository import BaseRepository

class InboundLineRepository(BaseRepository[InboundLine]):
    """Repository for inbound line operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, InboundLine)

    # get_by_id, create, update, delete - נורשים מהבסיס

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