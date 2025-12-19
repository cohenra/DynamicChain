from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload # OPTIMIZATION: Use joinedload instead of selectinload
from models.location import Location
from repositories.base_repository import BaseRepository


class LocationRepository(BaseRepository[Location]):
    """Repository for Location database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, Location)

    async def get_by_id(self, id: int, tenant_id: int) -> Optional[Location]:
        """Get a location by ID with tenant isolation and relationships loaded."""
        result = await self.db.execute(
            select(Location)
            .options(
                joinedload(Location.zone),
                joinedload(Location.warehouse)
            )
            .where(
                and_(
                    Location.id == id,
                    Location.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def bulk_create(self, locations: List[Location]) -> List[Location]:
        """Create multiple locations in bulk."""
        self.db.add_all(locations)
        await self.db.flush()

        if not locations:
            return []

        tenant_id = locations[0].tenant_id
        location_ids = [loc.id for loc in locations]

        result = await self.db.execute(
            select(Location)
            .options(
                joinedload(Location.zone),
                joinedload(Location.warehouse)
            )
            .where(
                and_(
                    Location.id.in_(location_ids),
                    Location.tenant_id == tenant_id
                )
            )
            .order_by(Location.name)
        )
        return list(result.scalars().all())

    async def get_by_name(self, name: str, warehouse_id: int, tenant_id: int) -> Optional[Location]:
        """Get a location by name within a warehouse and tenant."""
        result = await self.db.execute(
            select(Location).where(
                and_(
                    Location.name == name,
                    Location.warehouse_id == warehouse_id,
                    Location.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_locations(
        self,
        tenant_id: int,
        warehouse_id: Optional[int] = None,
        zone_id: Optional[int] = None,
        usage_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Location]:
        """List all locations for a tenant with optional filters and pagination."""
        filters = []
        if warehouse_id is not None:
            filters.append(Location.warehouse_id == warehouse_id)
        if zone_id is not None:
            filters.append(Location.zone_id == zone_id)
        if usage_id is not None:
            filters.append(Location.usage_id == usage_id)

        # OPTIMIZATION: joinedload performs a single query with JOINs, much faster for lists
        options = [
            joinedload(Location.zone),
            joinedload(Location.warehouse)
        ]

        return await self.list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=filters if filters else None,
            options=options,
            order_by=(Location.pick_sequence, Location.name)
        )

    async def count(
        self,
        tenant_id: int,
        warehouse_id: Optional[int] = None,
        zone_id: Optional[int] = None,
        usage_id: Optional[int] = None
    ) -> int:
        """Count total locations for a tenant with optional filters."""
        filters = []
        if warehouse_id is not None:
            filters.append(Location.warehouse_id == warehouse_id)
        if zone_id is not None:
            filters.append(Location.zone_id == zone_id)
        if usage_id is not None:
            filters.append(Location.usage_id == usage_id)

        return await super().count(
            tenant_id=tenant_id,
            filters=filters if filters else None
        )

    async def update(self, location: Location) -> Location:
        """Update an existing location and return with all relationships loaded."""
        await self.db.flush()
        return await self.get_by_id(id=location.id, tenant_id=location.tenant_id)