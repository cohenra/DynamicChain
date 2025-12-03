from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.uom_definition import UomDefinition


class UomDefinitionRepository:
    """Repository for UomDefinition database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, uom_definition: UomDefinition) -> UomDefinition:
        """Create a new UOM definition."""
        self.db.add(uom_definition)
        await self.db.flush()
        await self.db.refresh(uom_definition)
        return uom_definition

    async def get_by_id(self, uom_definition_id: int, tenant_id: int) -> Optional[UomDefinition]:
        """Get a UOM definition by ID with tenant isolation."""
        result = await self.db.execute(
            select(UomDefinition).where(
                and_(
                    UomDefinition.id == uom_definition_id,
                    UomDefinition.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

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

    async def list_uom_definitions(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[UomDefinition]:
        """List all UOM definitions for a tenant with pagination."""
        query = select(UomDefinition).where(UomDefinition.tenant_id == tenant_id)
        query = query.offset(skip).limit(limit).order_by(UomDefinition.code)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, tenant_id: int) -> int:
        """Count total UOM definitions for a tenant."""
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count(UomDefinition.id)).where(UomDefinition.tenant_id == tenant_id)
        )
        return result.scalar_one()

    async def update(self, uom_definition: UomDefinition) -> UomDefinition:
        """Update an existing UOM definition."""
        await self.db.flush()
        await self.db.refresh(uom_definition)
        return uom_definition

    async def delete(self, uom_definition: UomDefinition) -> None:
        """Delete a UOM definition."""
        await self.db.delete(uom_definition)
        await self.db.flush()
