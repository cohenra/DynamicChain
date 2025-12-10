from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.product import Product
from models.product_uom import ProductUOM
from repositories.base_repository import BaseRepository


class ProductRepository(BaseRepository[Product]):
    """Repository for Product database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, Product)

    async def get_by_id(self, product_id: int, tenant_id: int) -> Optional[Product]:
        """Get a product by ID with tenant isolation and all relationships loaded."""
        result = await self.db.execute(
            select(Product)
            .options(
                selectinload(Product.uoms).selectinload(ProductUOM.uom),
                selectinload(Product.base_uom),
                selectinload(Product.depositor)
            )
            .where(
                and_(
                    Product.id == product_id,
                    Product.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_sku(self, sku: str, tenant_id: int) -> Optional[Product]:
        """Get a product by SKU within a tenant."""
        result = await self.db.execute(
            select(Product)
            .where(
                and_(
                    Product.sku == sku,
                    Product.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_products(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        depositor_id: Optional[int] = None
    ) -> List[Product]:
        """List all products for a tenant with all relationships loaded."""
        filters = []
        if depositor_id is not None:
            filters.append(Product.depositor_id == depositor_id)

        options = [
            selectinload(Product.uoms).selectinload(ProductUOM.uom),
            selectinload(Product.base_uom),
            selectinload(Product.depositor)
        ]

        return await self.list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=filters if filters else None,
            options=options
        )

    async def update(self, product: Product) -> Product:
        """Update an existing product and return with all relationships loaded."""
        await self.db.flush()
        return await self.get_by_id(product.id, product.tenant_id)
