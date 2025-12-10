from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.location_type_definition import LocationTypeDefinition
from repositories.base_repository import BaseRepository

class LocationTypeDefinitionRepository(BaseRepository[LocationTypeDefinition]):
    """Repository for LocationTypeDefinition database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, LocationTypeDefinition)

    async def list_definitions(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[LocationTypeDefinition]:
        """List all location type definitions for a tenant with pagination."""
        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            order_by=LocationTypeDefinition.code
        )
    
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