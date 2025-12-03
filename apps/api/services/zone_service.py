from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.zone_repository import ZoneRepository
from repositories.warehouse_repository import WarehouseRepository
from schemas.zone import ZoneCreate, ZoneUpdate
from models.zone import Zone


class ZoneService:
    """Service for zone business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.zone_repo = ZoneRepository(db)
        self.warehouse_repo = WarehouseRepository(db)

    async def create_zone(
        self,
        zone_data: ZoneCreate,
        tenant_id: int
    ) -> Zone:
        """
        Create a new zone with code uniqueness validation.

        Args:
            zone_data: Zone creation data
            tenant_id: ID of the tenant creating the zone

        Returns:
            Created Zone instance

        Raises:
            HTTPException: If warehouse doesn't exist or code already exists
        """
        # Verify warehouse exists and belongs to tenant
        warehouse = await self.warehouse_repo.get_by_id(
            warehouse_id=zone_data.warehouse_id,
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
        """
        Get a zone by ID with tenant isolation.

        Args:
            zone_id: ID of the zone
            tenant_id: ID of the tenant

        Returns:
            Zone instance

        Raises:
            HTTPException: If zone not found
        """
        zone = await self.zone_repo.get_by_id(
            zone_id=zone_id,
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
        """
        List all zones for a tenant with optional warehouse filter and pagination.

        Args:
            tenant_id: ID of the tenant
            warehouse_id: Optional warehouse ID to filter by
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of Zone instances
        """
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
        """
        Update an existing zone.

        Args:
            zone_id: ID of the zone to update
            zone_data: Zone update data
            tenant_id: ID of the tenant

        Returns:
            Updated Zone instance

        Raises:
            HTTPException: If zone not found or code conflict
        """
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

        Args:
            zone_id: ID of the zone to delete
            tenant_id: ID of the tenant

        Raises:
            HTTPException: If zone not found
        """
        zone = await self.get_zone(zone_id, tenant_id)
        await self.zone_repo.delete(zone)
