from typing import Optional, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.location import Location, LocationUsage


class LocationRepository:
    """Repository for Location database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, location: Location) -> Location:
        """Create a new location."""
        self.db.add(location)
        await self.db.flush()
        return await self.get_by_id(location.id, location.tenant_id)

    async def bulk_create(self, locations: List[Location]) -> List[Location]:
        """Create multiple locations in bulk."""
        self.db.add_all(locations)
        await self.db.flush()

        # Re-fetch all created locations with relationships
        if not locations:
            return []

        tenant_id = locations[0].tenant_id
        location_ids = [loc.id for loc in locations]

        result = await self.db.execute(
            select(Location)
            .options(
                selectinload(Location.zone),
                selectinload(Location.warehouse)
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

    async def get_by_id(self, location_id: int, tenant_id: int) -> Optional[Location]:
        """Get a location by ID with tenant isolation and relationships loaded."""
        result = await self.db.execute(
            select(Location)
            .options(
                selectinload(Location.zone),
                selectinload(Location.warehouse)
            )
            .where(
                and_(
                    Location.id == location_id,
                    Location.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

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
        usage: Optional[LocationUsage] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Location]:
        """List all locations for a tenant with optional filters and pagination."""
        query = (
            select(Location)
            .options(
                selectinload(Location.zone),
                selectinload(Location.warehouse)
            )
            .where(Location.tenant_id == tenant_id)
        )

        if warehouse_id is not None:
            query = query.where(Location.warehouse_id == warehouse_id)

        if zone_id is not None:
            query = query.where(Location.zone_id == zone_id)

        if usage is not None:
            query = query.where(Location.usage == usage)

        query = query.offset(skip).limit(limit).order_by(Location.pick_sequence, Location.name)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(
        self,
        tenant_id: int,
        warehouse_id: Optional[int] = None,
        zone_id: Optional[int] = None,
        usage: Optional[LocationUsage] = None
    ) -> int:
        """Count total locations for a tenant with optional filters."""
        query = select(func.count(Location.id)).where(Location.tenant_id == tenant_id)

        if warehouse_id is not None:
            query = query.where(Location.warehouse_id == warehouse_id)

        if zone_id is not None:
            query = query.where(Location.zone_id == zone_id)

        if usage is not None:
            query = query.where(Location.usage == usage)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def update(self, location: Location) -> Location:
        """Update an existing location."""
        await self.db.flush()
        return await self.get_by_id(location.id, location.tenant_id)

    async def delete(self, location: Location) -> None:
        """Delete a location."""
        await self.db.delete(location)
        await self.db.flush()
