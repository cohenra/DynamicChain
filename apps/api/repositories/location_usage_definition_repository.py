from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.location_usage_definition import LocationUsageDefinition


class LocationUsageDefinitionRepository:
    """Repository for LocationUsageDefinition database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, definition: LocationUsageDefinition) -> LocationUsageDefinition:
        """Create a new location usage definition."""
        self.db.add(definition)
        await self.db.flush()
        await self.db.refresh(definition)
        return definition

    async def get_by_id(self, definition_id: int, tenant_id: int) -> Optional[LocationUsageDefinition]:
        """Get a location usage definition by ID with tenant isolation."""
        result = await self.db.execute(
            select(LocationUsageDefinition).where(
                and_(
                    LocationUsageDefinition.id == definition_id,
                    LocationUsageDefinition.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str, tenant_id: int) -> Optional[LocationUsageDefinition]:
        """Get a location usage definition by code within a tenant."""
        result = await self.db.execute(
            select(LocationUsageDefinition).where(
                and_(
                    LocationUsageDefinition.code == code,
                    LocationUsageDefinition.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_definitions(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[LocationUsageDefinition]:
        """List all location usage definitions for a tenant with pagination."""
        query = select(LocationUsageDefinition).where(LocationUsageDefinition.tenant_id == tenant_id)
        query = query.offset(skip).limit(limit).order_by(LocationUsageDefinition.code)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, tenant_id: int) -> int:
        """Count total location usage definitions for a tenant."""
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count(LocationUsageDefinition.id)).where(LocationUsageDefinition.tenant_id == tenant_id)
        )
        return result.scalar_one()

    async def update(self, definition: LocationUsageDefinition) -> LocationUsageDefinition:
        """Update an existing location usage definition."""
        await self.db.flush()
        await self.db.refresh(definition)
        return definition

    async def delete(self, definition: LocationUsageDefinition) -> None:
        """Delete a location usage definition."""
        await self.db.delete(definition)
        await self.db.flush()
