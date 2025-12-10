from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.uom_definition import UomDefinition
from repositories.base_repository import BaseRepository

class UomDefinitionRepository(BaseRepository[UomDefinition]):
    """Repository for UomDefinition database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, UomDefinition)

    async def list_uom_definitions(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[UomDefinition]:
        """List all UOM definitions for a tenant with pagination."""
        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            order_by=UomDefinition.code
        )

    async def get_by_code(self, code: str, tenant_id: int) -> Optional[UomDefinition]:
        """Get a UOM definition by code within a tenant."""
        result = await self.db.execute(
            select(UomDefinition).where(
                and_(
                    UomDefinition.code == code,
                    UomDefinition.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()