from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.product_uom import ProductUOM
from repositories.base_repository import BaseRepository

class ProductUOMRepository(BaseRepository[ProductUOM]):
    """Repository for ProductUOM database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, ProductUOM)

    async def get_by_id(self, id: int, tenant_id: int) -> Optional[ProductUOM]:
        """Get a ProductUOM by ID with tenant isolation and eager loading."""
        return await super().get_by_id(
            id=id, 
            tenant_id=tenant_id,
            options=[selectinload(ProductUOM.uom)]
        )

    async def list_all(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[ProductUOM]:
        """List all ProductUOMs for a tenant with pagination."""
        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            options=[selectinload(ProductUOM.uom)],
            order_by=ProductUOM.created_at.desc()
        )

    async def get_by_product_and_uom_id(
        self,
        product_id: int,
        uom_id: int,
        tenant_id: int
    ) -> Optional[ProductUOM]:
        """Get a ProductUOM by product_id and uom_id with tenant isolation."""
        result = await self.db.execute(
            select(ProductUOM).where(
                and_(
                    ProductUOM.product_id == product_id,
                    ProductUOM.uom_id == uom_id,
                    ProductUOM.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_barcode(
        self,
        barcode: str,
        tenant_id: int
    ) -> Optional[ProductUOM]:
        """Get a ProductUOM by barcode within a tenant."""
        result = await self.db.execute(
            select(ProductUOM).where(
                and_(
                    ProductUOM.barcode == barcode,
                    ProductUOM.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_by_product(
        self,
        product_id: int,
        tenant_id: int
    ) -> List[ProductUOM]:
        """List all ProductUOMs for a specific product with tenant isolation."""
        result = await self.db.execute(
            select(ProductUOM)
            .options(selectinload(ProductUOM.uom))
            .where(
                and_(
                    ProductUOM.product_id == product_id,
                    ProductUOM.tenant_id == tenant_id
                )
            )
            .order_by(ProductUOM.conversion_factor.asc())
        )
        return list(result.scalars().all())