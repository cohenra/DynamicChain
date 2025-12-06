from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from models.inbound_order import InboundOrder, InboundOrderStatus
from models.inbound_shipment import InboundShipment, InboundShipmentStatus
from models.inbound_line import InboundLine
from repositories.inbound_order_repository import InboundOrderRepository
from repositories.inbound_shipment_repository import InboundShipmentRepository
from repositories.inbound_line_repository import InboundLineRepository
from schemas.inbound import InboundOrderCreateRequest, InboundLineCreate, InboundLineUpdate

class InboundService:
    """Business logic for inbound operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.order_repo = InboundOrderRepository(db)
        self.shipment_repo = InboundShipmentRepository(db)
        self.line_repo = InboundLineRepository(db)

    async def list_orders(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[InboundOrderStatus] = None
    ) -> List[InboundOrder]:
        return await self.order_repo.list_orders(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            status=status
        )

    async def get_order(
        self,
        order_id: int,
        tenant_id: int
    ) -> InboundOrder:
        order = await self.order_repo.get_by_id(
            order_id=order_id,
            tenant_id=tenant_id
        )

        if not order:
            raise HTTPException(
                status_code=404,
                detail=f"Inbound order {order_id} not found"
            )

        return order

    async def create_order(
        self,
        order_data: InboundOrderCreateRequest,
        tenant_id: int
    ) -> InboundOrder:
        # 1. Create Header
        order = InboundOrder(
            tenant_id=tenant_id,
            order_number=order_data.order_number,
            order_type=order_data.order_type,
            status=InboundOrderStatus.DRAFT,
            supplier_name=order_data.supplier_name,
            customer_id=order_data.customer_id,
            expected_delivery_date=order_data.expected_delivery_date,
            notes=order_data.notes
        )
        self.db.add(order)
        await self.db.flush()

        # 2. Create Lines
        for line_data in order_data.lines:
            line = InboundLine(
                inbound_order_id=order.id,
                product_id=line_data.product_id,
                uom_id=line_data.uom_id,
                expected_quantity=line_data.expected_quantity,
                expected_batch=line_data.expected_batch,
                notes=line_data.notes,
                received_quantity=0
            )
            self.db.add(line)

        await self.db.commit()
        return await self.get_order(order.id, tenant_id)

    async def add_line_to_order(
        self,
        order_id: int,
        line_data: InboundLineCreate,
        tenant_id: int
    ) -> InboundOrder:
        """Add a line to an existing order."""
        order = await self.get_order(order_id, tenant_id)
        
        if order.status == InboundOrderStatus.COMPLETED or order.status == InboundOrderStatus.CANCELLED:
             raise HTTPException(status_code=400, detail="Cannot add lines to closed/cancelled orders")

        line = InboundLine(
            inbound_order_id=order.id,
            product_id=line_data.product_id,
            uom_id=line_data.uom_id,
            expected_quantity=line_data.expected_quantity,
            expected_batch=line_data.expected_batch,
            notes=line_data.notes,
            received_quantity=0
        )
        self.db.add(line)
        await self.db.commit()
        return await self.get_order(order_id, tenant_id)

    async def update_line(
        self,
        line_id: int,
        line_data: InboundLineUpdate,
        tenant_id: int
    ) -> InboundLine:
        """Update an existing line."""
        line = await self.line_repo.get_by_id(line_id)
        if not line:
            raise HTTPException(status_code=404, detail="Line not found")
            
        # Security check
        order = await self.order_repo.get_by_id(line.inbound_order_id, tenant_id)
        if not order:
             raise HTTPException(status_code=404, detail="Order not found")

        if line_data.expected_quantity is not None:
            line.expected_quantity = line_data.expected_quantity
        if line_data.expected_batch is not None:
            line.expected_batch = line_data.expected_batch
        if line_data.notes is not None:
            line.notes = line_data.notes
            
        await self.line_repo.update(line)
        await self.db.commit()
        return line

    # --- התיקון הקריטי: הפונקציה שחסרה ---
    async def close_order(self, order_id: int, tenant_id: int) -> InboundOrder:
        """Close an order manually."""
        order = await self.get_order(order_id, tenant_id)
        order.status = InboundOrderStatus.COMPLETED
        await self.order_repo.update(order)
        await self.db.commit()
        return order
    # ---------------------------------------

    async def create_shipment(
        self,
        order_id: int,
        tenant_id: int,
        shipment_number: str,
        container_number: Optional[str] = None,
        driver_details: Optional[str] = None,
        arrival_date: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> InboundShipment:
        order = await self.get_order(order_id, tenant_id)

        existing = await self.shipment_repo.get_by_shipment_number(shipment_number)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Shipment number {shipment_number} already exists"
            )

        shipment = InboundShipment(
            inbound_order_id=order.id,
            shipment_number=shipment_number,
            status=InboundShipmentStatus.SCHEDULED,
            container_number=container_number,
            driver_details=driver_details,
            arrival_date=arrival_date,
            notes=notes
        )

        shipment = await self.shipment_repo.create(shipment)
        await self.db.commit()

        return shipment

    async def update_shipment_status(
        self,
        shipment_id: int,
        status: InboundShipmentStatus,
        tenant_id: int
    ) -> InboundShipment:
        shipment = await self.shipment_repo.get_by_id(shipment_id)

        if not shipment:
            raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")

        order = await self.order_repo.get_by_id(shipment.inbound_order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        shipment.status = status

        if status == InboundShipmentStatus.ARRIVED and not shipment.arrival_date:
            shipment.arrival_date = datetime.utcnow()
        elif status == InboundShipmentStatus.CLOSED:
            shipment.closed_date = datetime.utcnow()

        shipment = await self.shipment_repo.update(shipment)
        await self.db.commit()

        return shipment