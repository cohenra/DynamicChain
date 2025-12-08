from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.outbound_order import OutboundOrder, OutboundOrderStatus
from models.outbound_line import OutboundLine


class OutboundOrderRepository:
    """Repository for outbound order operations with proper eager loading."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, order: OutboundOrder) -> OutboundOrder:
        """Create a new outbound order."""
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)
        return order

    async def get_by_id(
        self,
        order_id: int,
        tenant_id: int,
    ) -> Optional[OutboundOrder]:
        """
        Get outbound order by ID with ALL relationships eagerly loaded.
        This ensures no N+1 queries.
        """
        stmt = (
            select(OutboundOrder)
            .where(
                OutboundOrder.id == order_id,
                OutboundOrder.tenant_id == tenant_id
            )
            .options(
                # Load lines with their products and UOMs
                selectinload(OutboundOrder.lines)
                .selectinload(OutboundLine.product),
                selectinload(OutboundOrder.lines)
                .selectinload(OutboundLine.uom),
                # Load pick tasks
                selectinload(OutboundOrder.pick_tasks)
            )
        )

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_orders(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OutboundOrderStatus] = None,
        customer_id: Optional[int] = None,
        order_type: Optional[str] = None
    ) -> List[OutboundOrder]:
        """
        List outbound orders with ALL relationships eagerly loaded.
        This is critical to avoid N+1 queries in list views.
        """
        stmt = (
            select(OutboundOrder)
            .where(OutboundOrder.tenant_id == tenant_id)
        )

        if status:
            stmt = stmt.where(OutboundOrder.status == status)

        if customer_id:
            stmt = stmt.where(OutboundOrder.customer_id == customer_id)

        if order_type:
            stmt = stmt.where(OutboundOrder.order_type == order_type)

        # CRITICAL: Eager load ALL relationships
        stmt = stmt.options(
            selectinload(OutboundOrder.lines)
            .selectinload(OutboundLine.product),
            selectinload(OutboundOrder.lines)
            .selectinload(OutboundLine.uom),
            selectinload(OutboundOrder.pick_tasks)
        )

        stmt = stmt.offset(skip).limit(limit).order_by(OutboundOrder.created_at.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, order: OutboundOrder) -> OutboundOrder:
        """Update an outbound order."""
        await self.db.flush()
        await self.db.refresh(order)
        return order

    async def get_by_order_number(
        self,
        order_number: str,
        tenant_id: int
    ) -> Optional[OutboundOrder]:
        """Get order by order number."""
        stmt = select(OutboundOrder).where(
            OutboundOrder.order_number == order_number,
            OutboundOrder.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
