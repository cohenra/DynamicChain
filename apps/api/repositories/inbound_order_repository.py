from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.inbound_order import InboundOrder, InboundOrderStatus
from models.inbound_line import InboundLine
from repositories.base_repository import BaseRepository

class InboundOrderRepository(BaseRepository[InboundOrder]):
    """Repository for inbound order operations with proper eager loading."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, InboundOrder)

    async def get_by_id(
        self,
        id: int,
        tenant_id: int,
    ) -> Optional[InboundOrder]:
        """Get inbound order by ID with ALL relationships eagerly loaded."""
        # אנו משתמשים במימוש הבסיסי אך מעבירים לו options לטעינה
        return await super().get_by_id(
            id=id, 
            tenant_id=tenant_id,
            options=[
                selectinload(InboundOrder.lines).selectinload(InboundLine.product),
                selectinload(InboundOrder.lines).selectinload(InboundLine.uom),
                selectinload(InboundOrder.shipments)
            ]
        )

    async def list_orders(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[InboundOrderStatus] = None
    ) -> List[InboundOrder]:
        """List inbound orders with ALL relationships eagerly loaded."""
        filters = []
        if status:
            filters.append(InboundOrder.status == status)

        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=filters,
            options=[
                selectinload(InboundOrder.lines).selectinload(InboundLine.product),
                selectinload(InboundOrder.lines).selectinload(InboundLine.uom),
                selectinload(InboundOrder.shipments)
            ],
            order_by=InboundOrder.created_at.desc()
        )

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