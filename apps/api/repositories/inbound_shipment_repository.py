from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.inbound_shipment import InboundShipment
from repositories.base_repository import BaseRepository

class InboundShipmentRepository(BaseRepository[InboundShipment]):
    """Repository for inbound shipment operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, InboundShipment)

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