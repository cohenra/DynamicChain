from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.location_repository import LocationRepository
from repositories.zone_repository import ZoneRepository
from repositories.warehouse_repository import WarehouseRepository
from repositories.inventory_repository import InventoryRepository # Added
from schemas.location import LocationCreate, LocationUpdate, LocationBulkCreateConfig
from models.location import Location


class LocationService:
    """Service for location business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.location_repo = LocationRepository(db)
        self.zone_repo = ZoneRepository(db)
        self.warehouse_repo = WarehouseRepository(db)
        self.inventory_repo = InventoryRepository(db) # Added

    async def create_location(
        self,
        location_data: LocationCreate,
        tenant_id: int
    ) -> Location:
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
        # Verify warehouse exists
        warehouse = await self.warehouse_repo.get_by_id(
            warehouse_id=config.warehouse_id,
            tenant_id=tenant_id
        )
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Warehouse with ID {config.warehouse_id} not found"
            )

        # Verify zone exists
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

        # Generate locations
        locations = []

        # Initialize pick_sequence regardless of strategy to avoid UnboundLocalError
        pick_sequence = config.pick_sequence_start

        # Calculate pick sequences based on strategy
        pick_sequences = {}
        if config.picking_strategy == "SNAKE_ODD_EVEN":
            pick_sequences = self._calculate_snake_odd_even_sequences(
                config.bay_start, config.bay_end,
                config.level_start, config.level_end,
                config.slot_start, config.slot_end,
                config.pick_sequence_start
            )

        # Use bulk get to check existence instead of N queries
        # (Simplified implementation - checking individually for now, but should optimize for large batches)
        
        for bay_num in range(config.bay_start, config.bay_end + 1):
            for level_num in range(config.level_start, config.level_end + 1):
                for slot_num in range(config.slot_start, config.slot_end + 1):
                    bay_str = str(bay_num).zfill(2)
                    level_str = str(level_num).zfill(2)
                    slot_str = str(slot_num).zfill(2)
                    location_name = f"{config.aisle}-{bay_str}-{level_str}-{slot_str}"

                    # Determine sequence
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

        # Use repository bulk_create which handles flush
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
        sequences = {}
        current_seq = start_seq

        for bay_num in range(bay_start, bay_end + 1):
            bay_is_odd = (bay_num % 2 == 1)
            
            # Odd bays: Bottom to Top. Even bays: Top to Bottom
            level_range = (
                range(level_start, level_end + 1) if bay_is_odd
                else range(level_end, level_start - 1, -1)
            )

            for level_num in level_range:
                level_is_odd = (level_num % 2 == 1)
                
                # Odd levels: Left to Right. Even levels: Right to Left
                slot_range = (
                    range(slot_start, slot_end + 1) if level_is_odd
                    else range(slot_end, slot_start - 1, -1)
                )

                for slot_num in slot_range:
                    sequences[(bay_num, level_num, slot_num)] = current_seq
                    current_seq += 1

        return sequences

    async def get_location(self, location_id: int, tenant_id: int) -> Location:
        location = await self.location_repo.get_by_id(location_id=location_id, tenant_id=tenant_id)
        if not location:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Location with ID {location_id} not found")
        return location

    async def list_locations(self, tenant_id: int, warehouse_id: Optional[int] = None, zone_id: Optional[int] = None, usage_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[Location]:
        return await self.location_repo.list_locations(tenant_id=tenant_id, warehouse_id=warehouse_id, zone_id=zone_id, usage_id=usage_id, skip=skip, limit=limit)

    async def update_location(self, location_id: int, location_data: LocationUpdate, tenant_id: int) -> Location:
        location = await self.get_location(location_id, tenant_id)
        if location_data.name and location_data.name != location.name:
            existing_location = await self.location_repo.get_by_name(name=location_data.name, warehouse_id=location.warehouse_id, tenant_id=tenant_id)
            if existing_location:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Location with name '{location_data.name}' already exists")
            location.name = location_data.name
        
        if location_data.aisle is not None: location.aisle = location_data.aisle
        if location_data.bay is not None: location.bay = location_data.bay
        if location_data.level is not None: location.level = location_data.level
        if location_data.slot is not None: location.slot = location_data.slot
        if location_data.type_id is not None: location.type_id = location_data.type_id
        if location_data.usage_id is not None: location.usage_id = location_data.usage_id
        if location_data.pick_sequence is not None: location.pick_sequence = location_data.pick_sequence

        return await self.location_repo.update(location)

    async def delete_location(self, location_id: int, tenant_id: int) -> None:
        """Delete a location. Block if inventory exists."""
        location = await self.get_location(location_id, tenant_id)
        
        # Check inventory quantity > 0
        from models.inventory import Inventory
        from sqlalchemy import select, func
        
        stmt = select(func.count(Inventory.id)).where(
            Inventory.location_id == location_id,
            Inventory.quantity > 0,
            Inventory.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        active_inventory = result.scalar_one()

        if active_inventory > 0:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete location: Active inventory exists"
            )

        await self.location_repo.delete(location)