from typing import Optional, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.inbound_order import InboundOrder, InboundOrderStatus


class InboundOrderRepository:
    """Repository for InboundOrder database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, inbound_order: InboundOrder) -> InboundOrder:
        """Create a new inbound order."""
        self.db.add(inbound_order)
        await self.db.flush()
        await self.db.refresh(inbound_order)
        return inbound_order

    async def get_by_id(
        self,
        order_id: int,
        tenant_id: int,
        load_lines: bool = False,
        load_shipments: bool = False
    ) -> Optional[InboundOrder]:
        """Get an inbound order by ID with tenant isolation and optional eager loading."""
        query = select(InboundOrder).where(
            and_(
                InboundOrder.id == order_id,
                InboundOrder.tenant_id == tenant_id
            )
        )

        # Eager load relationships if requested
        if load_lines:
            query = query.options(selectinload(InboundOrder.lines))
        if load_shipments:
            query = query.options(selectinload(InboundOrder.shipments))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_order_number(
        self,
        order_number: str,
        tenant_id: int,
        load_lines: bool = False
    ) -> Optional[InboundOrder]:
        """Get an inbound order by order number within a tenant."""
        query = select(InboundOrder).where(
            and_(
                InboundOrder.order_number == order_number,
                InboundOrder.tenant_id == tenant_id
            )
        )

        if load_lines:
            query = query.options(selectinload(InboundOrder.lines))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_orders(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[InboundOrderStatus] = None,
        load_lines: bool = False
    ) -> List[InboundOrder]:
        """List all inbound orders for a tenant with pagination and optional filtering."""
        query = select(InboundOrder).where(InboundOrder.tenant_id == tenant_id)

        if status:
            query = query.where(InboundOrder.status == status)

        if load_lines:
            query = query.options(selectinload(InboundOrder.lines))

        query = query.offset(skip).limit(limit).order_by(InboundOrder.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(
        self,
        tenant_id: int,
        status: Optional[InboundOrderStatus] = None
    ) -> int:
        """Count total inbound orders for a tenant with optional status filter."""
        query = select(func.count(InboundOrder.id)).where(InboundOrder.tenant_id == tenant_id)

        if status:
            query = query.where(InboundOrder.status == status)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def update(self, inbound_order: InboundOrder) -> InboundOrder:
        """Update an existing inbound order."""
        await self.db.flush()
        await self.db.refresh(inbound_order)
        return inbound_order

    async def delete(self, inbound_order: InboundOrder) -> None:
        """Delete an inbound order."""
        await self.db.delete(inbound_order)
        await self.db.flush()
