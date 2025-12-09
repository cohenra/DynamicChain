from typing import List, Optional
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.outbound_order import OutboundOrder, OutboundOrderStatus
from models.outbound_line import OutboundLine
from models.pick_task import PickTask
from models.outbound_wave import OutboundWave

class OutboundOrderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, order: OutboundOrder) -> OutboundOrder:
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)
        # מחזירים את האובייקט המלא עם הנתונים
        return await self.get_by_id(order.id, order.tenant_id)

    async def get_by_id(self, order_id: int, tenant_id: int) -> Optional[OutboundOrder]:
        query = select(OutboundOrder).where(
            and_(OutboundOrder.id == order_id, OutboundOrder.tenant_id == tenant_id)
        ).options(
            # טעינת נתונים מקושרים (חשוב מאוד!)
            selectinload(OutboundOrder.lines).selectinload(OutboundLine.product),
            selectinload(OutboundOrder.lines).selectinload(OutboundLine.uom),
            selectinload(OutboundOrder.pick_tasks).selectinload(PickTask.from_location),
            selectinload(OutboundOrder.customer),
            selectinload(OutboundOrder.wave)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

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
        query = select(OutboundOrder).where(OutboundOrder.tenant_id == tenant_id)

        # --- התיקון: טעינת שורות ומשימות ברשימה ---
        query = query.options(
            selectinload(OutboundOrder.lines).selectinload(OutboundLine.product),
            selectinload(OutboundOrder.lines).selectinload(OutboundLine.uom),
            selectinload(OutboundOrder.pick_tasks),
            selectinload(OutboundOrder.customer),
            selectinload(OutboundOrder.wave)
        )
        # ------------------------------------------

        if status:
            query = query.where(OutboundOrder.status == status)
        
        if customer_id:
            query = query.where(OutboundOrder.customer_id == customer_id)

        if order_type:
            query = query.where(OutboundOrder.order_type == order_type)

        if search:
            query = query.where(
                or_(
                    OutboundOrder.order_number.ilike(f"%{search}%"),
                    # אפשר להוסיף חיפוש לפי שם לקוח אם עושים JOIN
                )
            )

        query = query.order_by(OutboundOrder.priority.asc(), OutboundOrder.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def update(self, order: OutboundOrder) -> OutboundOrder:
        await self.db.flush()
        await self.db.refresh(order)
        return order