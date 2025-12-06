from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.inbound_order import InboundOrder, InboundOrderStatus
from models.inbound_line import InboundLine


class InboundOrderRepository:
    """Repository for inbound order operations with proper eager loading."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, order: InboundOrder) -> InboundOrder:
        """Create a new inbound order."""
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)
        return order

    async def get_by_id(
        self,
        order_id: int,
        tenant_id: int,
    ) -> Optional[InboundOrder]:
        """
        Get inbound order by ID with ALL relationships eagerly loaded.
        This ensures no N+1 queries.
        """
        stmt = (
            select(InboundOrder)
            .where(
                InboundOrder.id == order_id,
                InboundOrder.tenant_id == tenant_id
            )
            .options(
                # Load lines with their products and UOMs
                selectinload(InboundOrder.lines)
                .selectinload(InboundLine.product),
                selectinload(InboundOrder.lines)
                .selectinload(InboundLine.uom),
                # Load shipments
                selectinload(InboundOrder.shipments)
            )
        )

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_orders(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[InboundOrderStatus] = None
    ) -> List[InboundOrder]:
        """
        List inbound orders with ALL relationships eagerly loaded.
        This is critical to avoid N+1 queries in list views.
        """
        stmt = (
            select(InboundOrder)
            .where(InboundOrder.tenant_id == tenant_id)
        )

        if status:
            stmt = stmt.where(InboundOrder.status == status)

        # CRITICAL: Eager load ALL relationships
        stmt = stmt.options(
            selectinload(InboundOrder.lines)
            .selectinload(InboundLine.product),
            selectinload(InboundOrder.lines)
            .selectinload(InboundLine.uom),
            selectinload(InboundOrder.shipments)
        )

        stmt = stmt.offset(skip).limit(limit).order_by(InboundOrder.created_at.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, order: InboundOrder) -> InboundOrder:
        """Update an inbound order."""
        await self.db.flush()
        await self.db.refresh(order)
        return order

    async def get_by_order_number(
        self,
        order_number: str,
        tenant_id: int
    ) -> Optional[InboundOrder]:
        """Get order by order number."""
        stmt = select(InboundOrder).where(
            InboundOrder.order_number == order_number,
            InboundOrder.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
