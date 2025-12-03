from typing import Optional, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.zone import Zone


class ZoneRepository:
    """Repository for Zone database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, zone: Zone) -> Zone:
        """Create a new zone."""
        self.db.add(zone)
        await self.db.flush()
        return await self.get_by_id(zone.id, zone.tenant_id)

    async def get_by_id(self, zone_id: int, tenant_id: int) -> Optional[Zone]:
        """Get a zone by ID with tenant isolation and relationships loaded."""
        result = await self.db.execute(
            select(Zone)
            .options(
                selectinload(Zone.warehouse)
            )
            .where(
                and_(
                    Zone.id == zone_id,
                    Zone.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str, warehouse_id: int, tenant_id: int) -> Optional[Zone]:
        """Get a zone by code within a warehouse and tenant."""
        result = await self.db.execute(
            select(Zone).where(
                and_(
                    Zone.code == code,
                    Zone.warehouse_id == warehouse_id,
                    Zone.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_zones(
        self,
        tenant_id: int,
        warehouse_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Zone]:
        """List all zones for a tenant with optional warehouse filter and pagination."""
        query = select(Zone).options(selectinload(Zone.warehouse)).where(Zone.tenant_id == tenant_id)

        if warehouse_id is not None:
            query = query.where(Zone.warehouse_id == warehouse_id)

        query = query.offset(skip).limit(limit).order_by(Zone.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, tenant_id: int, warehouse_id: Optional[int] = None) -> int:
        """Count total zones for a tenant with optional warehouse filter."""
        query = select(func.count(Zone.id)).where(Zone.tenant_id == tenant_id)

        if warehouse_id is not None:
            query = query.where(Zone.warehouse_id == warehouse_id)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def update(self, zone: Zone) -> Zone:
        """Update an existing zone."""
        await self.db.flush()
        return await self.get_by_id(zone.id, zone.tenant_id)

    async def delete(self, zone: Zone) -> None:
        """Delete a zone."""
        await self.db.delete(zone)
        await self.db.flush()
