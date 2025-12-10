from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.location_usage_definition import LocationUsageDefinition
from repositories.base_repository import BaseRepository

class LocationUsageDefinitionRepository(BaseRepository[LocationUsageDefinition]):
    """Repository for LocationUsageDefinition database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, LocationUsageDefinition)

    async def list_definitions(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[LocationUsageDefinition]:
        """List all location usage definitions for a tenant with pagination."""
        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            order_by=LocationUsageDefinition.code
        )

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