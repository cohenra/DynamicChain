from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.zone_repository import ZoneRepository
from repositories.warehouse_repository import WarehouseRepository
from repositories.inventory_repository import InventoryRepository
from schemas.zone import ZoneCreate, ZoneUpdate
from models.zone import Zone


class ZoneService:
    """Service for zone business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.zone_repo = ZoneRepository(db)
        self.warehouse_repo = WarehouseRepository(db)
        self.inventory_repo = InventoryRepository(db)

    # הוסף פונקציה זו בתוך המחלקה ZoneService
    async def count_zones(self, tenant_id: int, warehouse_id: Optional[int] = None) -> int:
        return await self.zone_repo.count(
            tenant_id=tenant_id,
            warehouse_id=warehouse_id
        )
        
    async def create_zone(
        self,
        zone_data: ZoneCreate,
        tenant_id: int
    ) -> Zone:
        # Verify warehouse exists and belongs to tenant
        # FIX: Changed 'warehouse_id' to 'id'
        warehouse = await self.warehouse_repo.get_by_id(
            id=zone_data.warehouse_id,
            tenant_id=tenant_id
        )
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Warehouse with ID {zone_data.warehouse_id} not found"
            )

        # Check if code already exists for this warehouse and tenant
        existing_zone = await self.zone_repo.get_by_code(
            code=zone_data.code,
            warehouse_id=zone_data.warehouse_id,
            tenant_id=tenant_id
        )

        if existing_zone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Zone with code '{zone_data.code}' already exists in this warehouse"
            )

        # Create new zone
        zone = Zone(
            tenant_id=tenant_id,
            warehouse_id=zone_data.warehouse_id,
            name=zone_data.name,
            code=zone_data.code
        )

        return await self.zone_repo.create(zone)

    async def get_zone(
        self,
        zone_id: int,
        tenant_id: int
    ) -> Zone:
        # FIX: Changed 'zone_id' to 'id'
        zone = await self.zone_repo.get_by_id(
            id=zone_id,
            tenant_id=tenant_id
        )

        if not zone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Zone with ID {zone_id} not found"
            )

        return zone

    async def list_zones(
        self,
        tenant_id: int,
        warehouse_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Zone]:
        return await self.zone_repo.list_zones(
            tenant_id=tenant_id,
            warehouse_id=warehouse_id,
            skip=skip,
            limit=limit
        )

    async def update_zone(
        self,
        zone_id: int,
        zone_data: ZoneUpdate,
        tenant_id: int
    ) -> Zone:
        # Get existing zone
        zone = await self.get_zone(zone_id, tenant_id)

        # Check code uniqueness if code is being updated
        if zone_data.code and zone_data.code != zone.code:
            existing_zone = await self.zone_repo.get_by_code(
                code=zone_data.code,
                warehouse_id=zone.warehouse_id,
                tenant_id=tenant_id
            )
            if existing_zone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Zone with code '{zone_data.code}' already exists in this warehouse"
                )
            zone.code = zone_data.code

        # Update fields if provided
        if zone_data.name is not None:
            zone.name = zone_data.name

        return await self.zone_repo.update(zone)

    async def delete_zone(
        self,
        zone_id: int,
        tenant_id: int
    ) -> None:
        """
        Delete a zone.
        Raises error if inventory exists in any location within the zone.
        """
        zone = await self.get_zone(zone_id, tenant_id)
        
        # Check if any inventory exists in this zone with quantity > 0
        from models.inventory import Inventory
        from models.location import Location
        from sqlalchemy import select, func
        
        stmt = select(func.count(Inventory.id)).join(Location).where(
            Location.zone_id == zone_id,
            Inventory.quantity > 0,
            Inventory.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        count = result.scalar_one()
        
        if count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete zone: Active inventory exists in this zone"
            )

        await self.zone_repo.delete(zone)