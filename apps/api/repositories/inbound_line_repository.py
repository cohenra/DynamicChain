from typing import Optional, List
from decimal import Decimal
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from models.inbound_line import InboundLine


class InboundLineRepository:
    """Repository for InboundLine database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, inbound_line: InboundLine) -> InboundLine:
        """Create a new inbound line."""
        self.db.add(inbound_line)
        await self.db.flush()
        await self.db.refresh(inbound_line)
        return inbound_line

    async def get_by_id(self, line_id: int) -> Optional[InboundLine]:
        """Get an inbound line by ID."""
        result = await self.db.execute(
            select(InboundLine).where(InboundLine.id == line_id)
        )
        return result.scalar_one_or_none()

    async def get_by_order_and_product(
        self,
        order_id: int,
        product_id: int
    ) -> Optional[InboundLine]:
        """Get an inbound line by order ID and product ID."""
        result = await self.db.execute(
            select(InboundLine).where(
                and_(
                    InboundLine.inbound_order_id == order_id,
                    InboundLine.product_id == product_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_by_order(self, order_id: int) -> List[InboundLine]:
        """List all lines for a specific inbound order."""
        result = await self.db.execute(
            select(InboundLine)
            .where(InboundLine.inbound_order_id == order_id)
            .order_by(InboundLine.created_at)
        )
        return list(result.scalars().all())

    async def update_received_quantity(
        self,
        line_id: int,
        additional_quantity: Decimal
    ) -> InboundLine:
        """Update the received quantity for a line by adding the additional quantity."""
        line = await self.get_by_id(line_id)
        if line:
            line.received_quantity += additional_quantity
            await self.db.flush()
            await self.db.refresh(line)
        return line

    async def update(self, inbound_line: InboundLine) -> InboundLine:
        """Update an existing inbound line."""
        await self.db.flush()
        await self.db.refresh(inbound_line)
        return inbound_line

    async def delete(self, inbound_line: InboundLine) -> None:
        """Delete an inbound line."""
        await self.db.delete(inbound_line)
        await self.db.flush()
