from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.product_repository import ProductRepository
from schemas.product import ProductCreate, ProductUpdate
from models.product import Product


class ProductService:
    """Service for product business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.product_repo = ProductRepository(db)

    async def create_product(
        self,
        product_data: ProductCreate,
        tenant_id: int
    ) -> Product:
        """
        Create a new product with SKU uniqueness validation.
        """
        # Check if SKU already exists for this tenant
        existing_product = await self.product_repo.get_by_sku(
            sku=product_data.sku,
            tenant_id=tenant_id
        )

        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with SKU '{product_data.sku}' already exists for this tenant"
            )

        # Create new product
        product = Product(
            tenant_id=tenant_id,
            sku=product_data.sku,
            name=product_data.name,
            barcode=product_data.barcode,
            base_uom_id=product_data.base_uom_id,
            depositor_id=product_data.depositor_id,
            custom_attributes=product_data.custom_attributes
        )

        created_product = await self.product_repo.create(product)
        
        # FIX: Re-fetch the product to ensure relationships (UOMs, etc.) are loaded
        # This prevents the "MissingGreenlet" error in Pydantic validation
        return await self.get_product(created_product.id, tenant_id)

    async def get_product(
        self,
        product_id: int,
        tenant_id: int
    ) -> Product:
        """
        Get a product by ID with tenant isolation.
        """
        product = await self.product_repo.get_by_id(
            product_id=product_id,
            tenant_id=tenant_id
        )

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found"
            )

        return product

    # ... (Keep list_products, update_product, delete_product as they were) ...
    async def list_products(self, tenant_id: int, skip: int = 0, limit: int = 100, depositor_id: Optional[int] = None) -> List[Product]:
        return await self.product_repo.list_products(tenant_id, skip, limit, depositor_id)

    async def update_product(self, product_id: int, product_data: ProductUpdate, tenant_id: int) -> Product:
        product = await self.get_product(product_id, tenant_id)
        if product_data.sku and product_data.sku != product.sku:
            existing = await self.product_repo.get_by_sku(product_data.sku, tenant_id)
            if existing: raise HTTPException(400, "SKU exists")
            product.sku = product_data.sku
        
        if product_data.name is not None: product.name = product_data.name
        if product_data.barcode is not None: product.barcode = product_data.barcode
        if product_data.base_uom_id is not None: product.base_uom_id = product_data.base_uom_id
        if product_data.depositor_id is not None: product.depositor_id = product_data.depositor_id
        if product_data.custom_attributes is not None: product.custom_attributes = product_data.custom_attributes
        
        return await self.product_repo.update(product)

    async def delete_product(self, product_id: int, tenant_id: int) -> None:
        product = await self.get_product(product_id, tenant_id)
        await self.product_repo.delete(product)