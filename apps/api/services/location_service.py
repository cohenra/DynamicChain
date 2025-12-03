from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.location_repository import LocationRepository
from repositories.zone_repository import ZoneRepository
from repositories.warehouse_repository import WarehouseRepository
from schemas.location import LocationCreate, LocationUpdate, LocationBulkCreateConfig
from models.location import Location


class LocationService:
    """Service for location business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.location_repo = LocationRepository(db)
        self.zone_repo = ZoneRepository(db)
        self.warehouse_repo = WarehouseRepository(db)

    async def create_location(
        self,
        location_data: LocationCreate,
        tenant_id: int
    ) -> Location:
        """
        Create a new location with name uniqueness validation.

        Args:
            location_data: Location creation data
            tenant_id: ID of the tenant creating the location

        Returns:
            Created Location instance

        Raises:
            HTTPException: If warehouse/zone doesn't exist or name already exists
        """
        # Verify warehouse exists and belongs to tenant
        warehouse = await self.warehouse_repo.get_by_id(
            warehouse_id=location_data.warehouse_id,
            tenant_id=tenant_id
        )
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Warehouse with ID {location_data.warehouse_id} not found"
            )

        # Verify zone exists and belongs to tenant and warehouse
        zone = await self.zone_repo.get_by_id(
            zone_id=location_data.zone_id,
            tenant_id=tenant_id
        )
        if not zone or zone.warehouse_id != location_data.warehouse_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Zone with ID {location_data.zone_id} not found in this warehouse"
            )

        # Check if name already exists for this warehouse and tenant
        existing_location = await self.location_repo.get_by_name(
            name=location_data.name,
            warehouse_id=location_data.warehouse_id,
            tenant_id=tenant_id
        )

        if existing_location:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Location with name '{location_data.name}' already exists in this warehouse"
            )

        # Create new location
        location = Location(
            tenant_id=tenant_id,
            warehouse_id=location_data.warehouse_id,
            zone_id=location_data.zone_id,
            name=location_data.name,
            aisle=location_data.aisle,
            bay=location_data.bay,
            level=location_data.level,
            slot=location_data.slot,
            type_id=location_data.type_id,
            usage_id=location_data.usage_id,
            pick_sequence=location_data.pick_sequence
        )

        return await self.location_repo.create(location)

    async def bulk_create_locations(
        self,
        config: LocationBulkCreateConfig,
        tenant_id: int
    ) -> List[Location]:
        """
        Create multiple locations based on a range configuration.

        Args:
            config: Bulk creation configuration
            tenant_id: ID of the tenant creating the locations

        Returns:
            List of created Location instances

        Raises:
            HTTPException: If warehouse/zone doesn't exist or validation fails
        """
        # Verify warehouse exists and belongs to tenant
        warehouse = await self.warehouse_repo.get_by_id(
            warehouse_id=config.warehouse_id,
            tenant_id=tenant_id
        )
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Warehouse with ID {config.warehouse_id} not found"
            )

        # Verify zone exists and belongs to tenant and warehouse
        zone = await self.zone_repo.get_by_id(
            zone_id=config.zone_id,
            tenant_id=tenant_id
        )
        if not zone or zone.warehouse_id != config.warehouse_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Zone with ID {config.zone_id} not found in this warehouse"
            )

        # Validate ranges
        if config.bay_end < config.bay_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bay end must be greater than or equal to bay start"
            )

        if config.level_end < config.level_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Level end must be greater than or equal to level start"
            )

        if config.slot_end < config.slot_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slot end must be greater than or equal to slot start"
            )

        # Generate locations with picking strategy
        locations = []

        # Calculate pick sequences based on strategy
        if config.picking_strategy == "SNAKE_ODD_EVEN":
            pick_sequences = self._calculate_snake_odd_even_sequences(
                config.bay_start, config.bay_end,
                config.level_start, config.level_end,
                config.slot_start, config.slot_end,
                config.pick_sequence_start
            )
        else:  # Default: ASCENDING
            pick_sequences = {}
            pick_sequence = config.pick_sequence_start

        for bay_num in range(config.bay_start, config.bay_end + 1):
            for level_num in range(config.level_start, config.level_end + 1):
                for slot_num in range(config.slot_start, config.slot_end + 1):
                    bay_str = str(bay_num).zfill(2)  # Zero-pad to 2 digits
                    level_str = str(level_num).zfill(2)  # Zero-pad to 2 digits
                    slot_str = str(slot_num).zfill(2)  # Zero-pad to 2 digits
                    location_name = f"{config.aisle}-{bay_str}-{level_str}-{slot_str}"

                    # Check if location already exists
                    existing = await self.location_repo.get_by_name(
                        name=location_name,
                        warehouse_id=config.warehouse_id,
                        tenant_id=tenant_id
                    )

                    if existing:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Location '{location_name}' already exists in this warehouse"
                        )

                    # Get pick sequence based on strategy
                    if config.picking_strategy == "SNAKE_ODD_EVEN":
                        current_pick_seq = pick_sequences.get((bay_num, level_num, slot_num), pick_sequence)
                    else:
                        current_pick_seq = pick_sequence
                        pick_sequence += 1

                    location = Location(
                        tenant_id=tenant_id,
                        warehouse_id=config.warehouse_id,
                        zone_id=config.zone_id,
                        name=location_name,
                        aisle=config.aisle,
                        bay=bay_str,
                        level=level_str,
                        slot=slot_str,
                        type_id=config.type_id,
                        usage_id=config.usage_id,
                        pick_sequence=current_pick_seq
                    )
                    locations.append(location)

        # Bulk create all locations
        return await self.location_repo.bulk_create(locations)

    def _calculate_snake_odd_even_sequences(
        self,
        bay_start: int,
        bay_end: int,
        level_start: int,
        level_end: int,
        slot_start: int,
        slot_end: int,
        start_seq: int
    ) -> dict:
        """
        Calculate pick sequences using Z-picking (snake odd/even) strategy.

        This strategy creates an efficient picking path by:
        - Going up odd slots/levels in ascending order
        - Coming down even slots/levels in descending order
        - Creating a snake pattern that minimizes travel distance

        Args:
            bay_start, bay_end: Bay range
            level_start, level_end: Level range
            slot_start, slot_end: Slot range
            start_seq: Starting sequence number

        Returns:
            Dictionary mapping (bay, level, slot) tuples to pick sequence numbers
        """
        sequences = {}
        current_seq = start_seq

        for bay_num in range(bay_start, bay_end + 1):
            # Determine if this bay is odd or even
            bay_is_odd = (bay_num % 2 == 1)

            # For odd bays, go ascending (bottom to top)
            # For even bays, go descending (top to bottom)
            level_range = (
                range(level_start, level_end + 1) if bay_is_odd
                else range(level_end, level_start - 1, -1)
            )

            for level_num in level_range:
                # Determine if this level is odd or even
                level_is_odd = (level_num % 2 == 1)

                # For odd levels, go ascending (left to right)
                # For even levels, go descending (right to left)
                slot_range = (
                    range(slot_start, slot_end + 1) if level_is_odd
                    else range(slot_end, slot_start - 1, -1)
                )

                for slot_num in slot_range:
                    sequences[(bay_num, level_num, slot_num)] = current_seq
                    current_seq += 1

        return sequences

    async def get_location(
        self,
        location_id: int,
        tenant_id: int
    ) -> Location:
        """
        Get a location by ID with tenant isolation.

        Args:
            location_id: ID of the location
            tenant_id: ID of the tenant

        Returns:
            Location instance

        Raises:
            HTTPException: If location not found
        """
        location = await self.location_repo.get_by_id(
            location_id=location_id,
            tenant_id=tenant_id
        )

        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location with ID {location_id} not found"
            )

        return location

    async def list_locations(
        self,
        tenant_id: int,
        warehouse_id: Optional[int] = None,
        zone_id: Optional[int] = None,
        usage_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Location]:
        """
        List all locations for a tenant with optional filters and pagination.

        Args:
            tenant_id: ID of the tenant
            warehouse_id: Optional warehouse ID to filter by
            zone_id: Optional zone ID to filter by
            usage_id: Optional usage definition ID to filter by
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of Location instances
        """
        return await self.location_repo.list_locations(
            tenant_id=tenant_id,
            warehouse_id=warehouse_id,
            zone_id=zone_id,
            usage_id=usage_id,
            skip=skip,
            limit=limit
        )

    async def update_location(
        self,
        location_id: int,
        location_data: LocationUpdate,
        tenant_id: int
    ) -> Location:
        """
        Update an existing location.

        Args:
            location_id: ID of the location to update
            location_data: Location update data
            tenant_id: ID of the tenant

        Returns:
            Updated Location instance

        Raises:
            HTTPException: If location not found or name conflict
        """
        # Get existing location
        location = await self.get_location(location_id, tenant_id)

        # Check name uniqueness if name is being updated
        if location_data.name and location_data.name != location.name:
            existing_location = await self.location_repo.get_by_name(
                name=location_data.name,
                warehouse_id=location.warehouse_id,
                tenant_id=tenant_id
            )
            if existing_location:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Location with name '{location_data.name}' already exists in this warehouse"
                )
            location.name = location_data.name

        # Update fields if provided
        if location_data.aisle is not None:
            location.aisle = location_data.aisle
        if location_data.bay is not None:
            location.bay = location_data.bay
        if location_data.level is not None:
            location.level = location_data.level
        if location_data.slot is not None:
            location.slot = location_data.slot
        if location_data.type_id is not None:
            location.type_id = location_data.type_id
        if location_data.usage_id is not None:
            location.usage_id = location_data.usage_id
        if location_data.pick_sequence is not None:
            location.pick_sequence = location_data.pick_sequence

        return await self.location_repo.update(location)

    async def delete_location(
        self,
        location_id: int,
        tenant_id: int
    ) -> None:
        """
        Delete a location.

        Args:
            location_id: ID of the location to delete
            tenant_id: ID of the tenant

        Raises:
            HTTPException: If location not found
        """
        location = await self.get_location(location_id, tenant_id)
        await self.location_repo.delete(location)
