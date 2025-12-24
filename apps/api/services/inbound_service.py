from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from sqlalchemy import select, and_

from models.inbound_order import InboundOrder, InboundOrderStatus
from models.inbound_shipment import InboundShipment, InboundShipmentStatus
from models.inbound_line import InboundLine
from repositories.inbound_order_repository import InboundOrderRepository
from repositories.inbound_shipment_repository import InboundShipmentRepository
from repositories.inbound_line_repository import InboundLineRepository
from repositories.depositor_repository import DepositorRepository
from schemas.inbound import InboundOrderCreateRequest, InboundLineCreate, InboundLineUpdate

class InboundService:
    """Business logic for inbound operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.order_repo = InboundOrderRepository(db)
        self.shipment_repo = InboundShipmentRepository(db)
        self.line_repo = InboundLineRepository(db)
        self.depositor_repo = DepositorRepository(db)

    # ... (Keep list_orders and get_order unchanged) ...
    async def list_orders(self, tenant_id: int, skip: int = 0, limit: int = 100, status: Optional[InboundOrderStatus] = None) -> List[InboundOrder]:
        return await self.order_repo.list_orders(tenant_id, skip, limit, status)

    async def get_order(self, order_id: int, tenant_id: int) -> InboundOrder:
        order = await self.order_repo.get_by_id(order_id, tenant_id)
        if not order: raise HTTPException(404, f"Order {order_id} not found")
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

        # FIX: Handle race condition with IntegrityError for duplicate order numbers
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Order number '{order_data.order_number}' already exists."
            )
        return await self.get_order(order.id, tenant_id)

    # ... (Keep rest of the file unchanged) ...
    async def add_line_to_order(self, order_id: int, line_data: InboundLineCreate, tenant_id: int) -> InboundOrder:
        order = await self.get_order(order_id, tenant_id)
        if order.status in [InboundOrderStatus.COMPLETED, InboundOrderStatus.CANCELLED]:
             raise HTTPException(400, "Cannot add lines to closed/cancelled orders")
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

    async def update_line(self, line_id: int, line_data: InboundLineUpdate, tenant_id: int) -> InboundLine:
        line = await self.line_repo.get_by_id(line_id)
        if not line: raise HTTPException(404, "Line not found")
        order = await self.order_repo.get_by_id(line.inbound_order_id, tenant_id)
        if not order: raise HTTPException(404, "Order not found")
        if line_data.expected_quantity is not None: line.expected_quantity = line_data.expected_quantity
        if line_data.expected_batch is not None: line.expected_batch = line_data.expected_batch
        if line_data.notes is not None: line.notes = line_data.notes
        await self.line_repo.update(line)
        await self.db.commit()
        return line

    async def close_order(self, order_id: int, tenant_id: int, force: bool = False) -> InboundOrder:
        order = await self.get_order(order_id, tenant_id)
        if not order.lines: raise HTTPException(400, "No lines")
        
        received_total = sum(l.received_quantity for l in order.lines)
        fully_rx = sum(1 for l in order.lines if l.received_quantity >= l.expected_quantity)
        
        if fully_rx == len(order.lines):
            order.status = InboundOrderStatus.COMPLETED
        elif received_total > 0:
            order.status = InboundOrderStatus.SHORT_CLOSED
            order.notes = (order.notes or "") + f"\nSHORT CLOSED on {datetime.utcnow()}"
        else:
            if not force: raise HTTPException(400, "Nothing received. Use force=True")
            order.status = InboundOrderStatus.CANCELLED
            order.notes = (order.notes or "") + f"\nFORCE CLOSED on {datetime.utcnow()}"
            
        await self.order_repo.update(order)
        await self.db.commit()
        return order

    async def create_shipment(self, order_id: int, tenant_id: int, shipment_number: str, container_number: Optional[str] = None, driver_details: Optional[str] = None, arrival_date: Optional[datetime] = None, notes: Optional[str] = None) -> InboundShipment:
        order = await self.get_order(order_id, tenant_id)
        existing = await self.shipment_repo.get_by_shipment_number(shipment_number)
        if existing: raise HTTPException(400, "Shipment exists")
        
        shipment = InboundShipment(inbound_order_id=order.id, shipment_number=shipment_number, status=InboundShipmentStatus.SCHEDULED, container_number=container_number, driver_details=driver_details, arrival_date=arrival_date, notes=notes)
        created = await self.shipment_repo.create(shipment)
        await self.db.commit()
        return await self.shipment_repo.get_by_id(created.id)

    async def update_shipment_status(self, shipment_id: int, status: InboundShipmentStatus, tenant_id: int) -> InboundShipment:
        shipment = await self.shipment_repo.get_by_id(shipment_id)
        if not shipment: raise HTTPException(404, "Shipment not found")
        order = await self.order_repo.get_by_id(shipment.inbound_order_id, tenant_id)
        if not order: raise HTTPException(404, "Order not found")
        
        shipment.status = status
        if status == InboundShipmentStatus.ARRIVED and not shipment.arrival_date: shipment.arrival_date = datetime.utcnow()
        elif status == InboundShipmentStatus.CLOSED: shipment.closed_date = datetime.utcnow()
        
        updated = await self.shipment_repo.update(shipment)
        await self.db.commit()
        return updated

    async def receive_shipment_item(self, shipment_id: int, receive_data: "ReceiveShipmentItemRequest", tenant_id: int, user_id: int) -> InboundShipment:
        from services.inventory_service import InventoryService
        from schemas.inventory import InventoryReceiveRequest
        
        shipment = await self.shipment_repo.get_by_id(shipment_id)
        if not shipment: raise HTTPException(404, "Shipment not found")
        if shipment.status == InboundShipmentStatus.CLOSED: raise HTTPException(400, "Shipment closed")
        
        order = await self.order_repo.get_by_id(shipment.inbound_order_id, tenant_id)
        if not order: raise HTTPException(404, "Order not found")
        
        line = await self.line_repo.get_by_id(receive_data.inbound_line_id)
        if not line or line.inbound_order_id != order.id: raise HTTPException(400, "Invalid line")
        
        new_total = line.received_quantity + receive_data.quantity
        if new_total > line.expected_quantity:
            dep = await self.depositor_repo.get_by_id(order.customer_id, tenant_id)
            if not dep or not dep.allow_over_receiving:
                raise HTTPException(400, "Over-receiving not allowed")

        inv_service = InventoryService(self.db)
        req = InventoryReceiveRequest(depositor_id=order.customer_id, product_id=line.product_id, location_id=receive_data.location_id, quantity=receive_data.quantity, lpn=receive_data.lpn, batch_number=receive_data.batch_number, expiry_date=receive_data.expiry_date, reference_doc=f"SHIPMENT-{shipment.shipment_number}")
        
        await inv_service.receive_stock(req, tenant_id, user_id, inbound_shipment_id=shipment_id)
        
        line.received_quantity = new_total
        await self.line_repo.update(line)
        
        if shipment.status == InboundShipmentStatus.SCHEDULED:
            shipment.status = InboundShipmentStatus.RECEIVING
            await self.shipment_repo.update(shipment)
            
        await self.db.commit()
        return await self.shipment_repo.get_by_id(shipment_id)