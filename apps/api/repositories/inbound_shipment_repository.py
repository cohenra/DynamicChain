from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.inbound_shipment import InboundShipment


class InboundShipmentRepository:
    """Repository for inbound shipment operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, shipment: InboundShipment) -> InboundShipment:
        """Create a new inbound shipment."""
        self.db.add(shipment)
        await self.db.flush()
        await self.db.refresh(shipment)
        return shipment

    async def get_by_id(
        self,
        shipment_id: int
    ) -> Optional[InboundShipment]:
        """Get inbound shipment by ID."""
        stmt = select(InboundShipment).where(InboundShipment.id == shipment_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_shipment_number(
        self,
        shipment_number: str
    ) -> Optional[InboundShipment]:
        """Get shipment by shipment number."""
        stmt = select(InboundShipment).where(
            InboundShipment.shipment_number == shipment_number
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_order(
        self,
        inbound_order_id: int
    ) -> List[InboundShipment]:
        """List all shipments for an inbound order."""
        stmt = (
            select(InboundShipment)
            .where(InboundShipment.inbound_order_id == inbound_order_id)
            .order_by(InboundShipment.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, shipment: InboundShipment) -> InboundShipment:
        """Update an inbound shipment."""
        await self.db.flush()
        await self.db.refresh(shipment)
        return shipment

    async def delete(self, shipment: InboundShipment) -> None:
        """Delete an inbound shipment."""
        await self.db.delete(shipment)
        await self.db.flush()
