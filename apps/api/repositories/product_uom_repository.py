from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.product_uom import ProductUOM

class ProductUOMRepository:
    """Repository for ProductUOM database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, product_uom: ProductUOM) -> ProductUOM:
        """Create a new ProductUOM."""
        self.db.add(product_uom)
        await self.db.flush()
        # Re-fetch to ensure relationships are loaded
        return await self.get_by_id(product_uom.id, product_uom.tenant_id)

    async def get_by_id(self, uom_id: int, tenant_id: int) -> Optional[ProductUOM]:
        """Get a ProductUOM by ID with tenant isolation."""
        result = await self.db.execute(
            select(ProductUOM)
            .options(selectinload(ProductUOM.uom)) # Load the definition relation
            .where(
                and_(
                    ProductUOM.id == uom_id,
                    ProductUOM.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

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
            .options(selectinload(ProductUOM.uom)) # Load here too
            .where(
                and_(
                    ProductUOM.product_id == product_id,
                    ProductUOM.tenant_id == tenant_id
                )
            )
            .order_by(ProductUOM.conversion_factor.asc())
        )
        return list(result.scalars().all())

    async def list_all(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[ProductUOM]:
        """List all ProductUOMs for a tenant with pagination."""
        result = await self.db.execute(
            select(ProductUOM)
            .options(selectinload(ProductUOM.uom))
            .where(ProductUOM.tenant_id == tenant_id)
            .offset(skip)
            .limit(limit)
            .order_by(ProductUOM.created_at.desc())
        )
        return list(result.scalars().all())

    async def update(self, product_uom: ProductUOM) -> ProductUOM:
        """Update an existing ProductUOM."""
        await self.db.flush()
        # Re-fetch to ensure relationships are loaded (Crucial fix!)
        return await self.get_by_id(product_uom.id, product_uom.tenant_id)

    async def delete(self, product_uom: ProductUOM) -> None:
        """Delete a ProductUOM."""
        await self.db.delete(product_uom)
        await self.db.flush()
