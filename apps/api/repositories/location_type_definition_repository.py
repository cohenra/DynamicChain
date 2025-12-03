from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.location_type_definition import LocationTypeDefinition


class LocationTypeDefinitionRepository:
    """Repository for LocationTypeDefinition database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, definition: LocationTypeDefinition) -> LocationTypeDefinition:
        """Create a new location type definition."""
        self.db.add(definition)
        await self.db.flush()
        await self.db.refresh(definition)
        return definition

    async def get_by_id(self, definition_id: int, tenant_id: int) -> Optional[LocationTypeDefinition]:
        """Get a location type definition by ID with tenant isolation."""
        result = await self.db.execute(
            select(LocationTypeDefinition).where(
                and_(
                    LocationTypeDefinition.id == definition_id,
                    LocationTypeDefinition.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str, tenant_id: int) -> Optional[LocationTypeDefinition]:
        """Get a location type definition by code within a tenant."""
        result = await self.db.execute(
            select(LocationTypeDefinition).where(
                and_(
                    LocationTypeDefinition.code == code,
                    LocationTypeDefinition.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_definitions(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[LocationTypeDefinition]:
        """List all location type definitions for a tenant with pagination."""
        query = select(LocationTypeDefinition).where(LocationTypeDefinition.tenant_id == tenant_id)
        query = query.offset(skip).limit(limit).order_by(LocationTypeDefinition.code)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, tenant_id: int) -> int:
        """Count total location type definitions for a tenant."""
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count(LocationTypeDefinition.id)).where(LocationTypeDefinition.tenant_id == tenant_id)
        )
        return result.scalar_one()

    async def update(self, definition: LocationTypeDefinition) -> LocationTypeDefinition:
        """Update an existing location type definition."""
        await self.db.flush()
        await self.db.refresh(definition)
        return definition

    async def delete(self, definition: LocationTypeDefinition) -> None:
        """Delete a location type definition."""
        await self.db.delete(definition)
        await self.db.flush()
