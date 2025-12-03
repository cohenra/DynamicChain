from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.product import Product


class ProductRepository:
    """Repository for Product database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, product: Product) -> Product:
        """Create a new product."""
        self.db.add(product)
        await self.db.flush()
        await self.db.refresh(product)
        # כדי למנוע קריסה, אנחנו שולפים את המוצר מחדש עם כל הקישורים שלו
        return await self.get_by_id(product.id, product.tenant_id)

    async def get_by_id(self, product_id: int, tenant_id: int) -> Optional[Product]:
        """Get a product by ID with tenant isolation."""
        result = await self.db.execute(
            select(Product)
            .options(selectinload(Product.uoms))  # טעינה מוקדמת של UOMs
            .options(selectinload(Product.base_uom)) # טעינה מוקדמת של יחידת בסיס
            .options(selectinload(Product.depositor)) # טעינה מוקדמת של מאחסן
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
        """List all products for a tenant with pagination and optional depositor filter."""
        query = select(Product).options(selectinload(Product.uoms)).options(selectinload(Product.base_uom)).where(Product.tenant_id == tenant_id)

        if depositor_id is not None:
            query = query.where(Product.depositor_id == depositor_id)

        query = query.offset(skip).limit(limit).order_by(Product.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, tenant_id: int) -> int:
        """Count total products for a tenant."""
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count(Product.id)).where(Product.tenant_id == tenant_id)
        )
        return result.scalar_one()

    async def update(self, product: Product) -> Product:
        """Update an existing product."""
        await self.db.flush()
        await self.db.refresh(product)
        return await self.get_by_id(product.id, product.tenant_id)

    async def delete(self, product: Product) -> None:
        """Delete a product."""
        await self.db.delete(product)
        await self.db.flush()
