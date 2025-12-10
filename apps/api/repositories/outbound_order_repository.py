from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.outbound_order import OutboundOrder, OutboundOrderStatus
from models.outbound_line import OutboundLine
from models.pick_task import PickTask
from repositories.base_repository import BaseRepository

class OutboundOrderRepository(BaseRepository[OutboundOrder]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, OutboundOrder)

    async def get_by_id(self, id: int, tenant_id: int) -> Optional[OutboundOrder]:
        # שימוש ב-Base עם טעינת קשרים מלאה ל-Detail View
        return await super().get_by_id(
            id=id,
            tenant_id=tenant_id,
            options=[
                selectinload(OutboundOrder.lines).selectinload(OutboundLine.product),
                selectinload(OutboundOrder.lines).selectinload(OutboundLine.uom),
                selectinload(OutboundOrder.pick_tasks).selectinload(PickTask.from_location),
                selectinload(OutboundOrder.customer),
                selectinload(OutboundOrder.wave)
            ]
        )

    async def list(
        self, 
        tenant_id: int, 
        skip: int = 0, 
        limit: int = 100, 
        status: Optional[OutboundOrderStatus] = None,
        customer_id: Optional[int] = None,
        order_type: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[OutboundOrder]:
        
        filters = []
        if status: filters.append(OutboundOrder.status == status)
        if customer_id: filters.append(OutboundOrder.customer_id == customer_id)
        if order_type: filters.append(OutboundOrder.order_type == order_type)
        if search:
            filters.append(or_(OutboundOrder.order_number.ilike(f"%{search}%")))

        # OPTIMIZATION: Load minimal relations for list view
        options = [
            selectinload(OutboundOrder.customer),
            selectinload(OutboundOrder.wave)  # <--- Added to support Wave column
        ]

        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=filters,
            options=options,
            order_by=OutboundOrder.priority.asc()
        )