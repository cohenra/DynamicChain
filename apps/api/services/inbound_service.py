from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from models.inbound_order import InboundOrder, InboundOrderStatus
from models.inbound_shipment import InboundShipment, InboundShipmentStatus
from repositories.inbound_order_repository import InboundOrderRepository
from repositories.inbound_shipment_repository import InboundShipmentRepository


class InboundService:
    """Business logic for inbound operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.order_repo = InboundOrderRepository(db)
        self.shipment_repo = InboundShipmentRepository(db)

    async def list_orders(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[InboundOrderStatus] = None
    ) -> List[InboundOrder]:
        """
        List inbound orders with all relationships loaded.
        Uses repository with proper eager loading to avoid N+1 queries.
        """
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
        """
        Get a single inbound order by ID with all relationships loaded.
        Raises 404 if not found.
        """
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

    async def create_shipment(
        self,
        order_id: int,
        tenant_id: int,
        shipment_number: str,
        container_number: Optional[str] = None,
        driver_details: Optional[str] = None,
        notes: Optional[str] = None
    ) -> InboundShipment:
        """
        Create a new shipment for an inbound order.
        """
        # Verify order exists and belongs to tenant
        order = await self.get_order(order_id, tenant_id)

        # Check if shipment number already exists
        existing = await self.shipment_repo.get_by_shipment_number(shipment_number)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Shipment number {shipment_number} already exists"
            )

        # Create shipment
        shipment = InboundShipment(
            inbound_order_id=order.id,
            shipment_number=shipment_number,
            status=InboundShipmentStatus.SCHEDULED,
            container_number=container_number,
            driver_details=driver_details,
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
        """Update shipment status."""
        shipment = await self.shipment_repo.get_by_id(shipment_id)

        if not shipment:
            raise HTTPException(
                status_code=404,
                detail=f"Shipment {shipment_id} not found"
            )

        # Verify shipment belongs to order in this tenant
        order = await self.order_repo.get_by_id(
            shipment.inbound_order_id,
            tenant_id
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        shipment.status = status

        if status == InboundShipmentStatus.ARRIVED:
            shipment.arrival_date = datetime.utcnow()
        elif status == InboundShipmentStatus.CLOSED:
            shipment.closed_date = datetime.utcnow()

        shipment = await self.shipment_repo.update(shipment)
        await self.db.commit()

        return shipment
