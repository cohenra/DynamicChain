from typing import Optional, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from models.inbound_shipment import InboundShipment, InboundShipmentStatus


class InboundShipmentRepository:
    """Repository for InboundShipment database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, inbound_shipment: InboundShipment) -> InboundShipment:
        """Create a new inbound shipment."""
        self.db.add(inbound_shipment)
        await self.db.flush()
        await self.db.refresh(inbound_shipment)
        return inbound_shipment

    async def get_by_id(self, shipment_id: int) -> Optional[InboundShipment]:
        """Get an inbound shipment by ID."""
        result = await self.db.execute(
            select(InboundShipment).where(InboundShipment.id == shipment_id)
        )
        return result.scalar_one_or_none()

    async def get_by_shipment_number(
        self,
        shipment_number: str
    ) -> Optional[InboundShipment]:
        """Get an inbound shipment by shipment number."""
        result = await self.db.execute(
            select(InboundShipment).where(
                InboundShipment.shipment_number == shipment_number
            )
        )
        return result.scalar_one_or_none()

    async def list_by_order(
        self,
        order_id: int,
        status: Optional[InboundShipmentStatus] = None
    ) -> List[InboundShipment]:
        """List all shipments for a specific inbound order."""
        query = select(InboundShipment).where(
            InboundShipment.inbound_order_id == order_id
        )

        if status:
            query = query.where(InboundShipment.status == status)

        query = query.order_by(InboundShipment.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_by_order(
        self,
        order_id: int,
        status: Optional[InboundShipmentStatus] = None
    ) -> int:
        """Count shipments for a specific inbound order."""
        query = select(func.count(InboundShipment.id)).where(
            InboundShipment.inbound_order_id == order_id
        )

        if status:
            query = query.where(InboundShipment.status == status)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def update(self, inbound_shipment: InboundShipment) -> InboundShipment:
        """Update an existing inbound shipment."""
        await self.db.flush()
        await self.db.refresh(inbound_shipment)
        return inbound_shipment

    async def delete(self, inbound_shipment: InboundShipment) -> None:
        """Delete an inbound shipment."""
        await self.db.delete(inbound_shipment)
        await self.db.flush()
