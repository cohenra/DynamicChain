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

        Args:
            product_data: Product creation data
            tenant_id: ID of the tenant creating the product

        Returns:
            Created Product instance

        Raises:
            HTTPException: If SKU already exists for this tenant
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
            custom_attributes=product_data.custom_attributes
        )

        return await self.product_repo.create(product)

    async def get_product(
        self,
        product_id: int,
        tenant_id: int
    ) -> Product:
        """
        Get a product by ID with tenant isolation.

        Args:
            product_id: ID of the product
            tenant_id: ID of the tenant

        Returns:
            Product instance

        Raises:
            HTTPException: If product not found
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

    async def list_products(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        List all products for a tenant with pagination.

        Args:
            tenant_id: ID of the tenant
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of Product instances
        """
        return await self.product_repo.list_products(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit
        )

    async def update_product(
        self,
        product_id: int,
        product_data: ProductUpdate,
        tenant_id: int
    ) -> Product:
        """
        Update an existing product.

        Args:
            product_id: ID of the product to update
            product_data: Product update data
            tenant_id: ID of the tenant

        Returns:
            Updated Product instance

        Raises:
            HTTPException: If product not found or SKU conflict
        """
        # Get existing product
        product = await self.get_product(product_id, tenant_id)

        # Check SKU uniqueness if SKU is being updated
        if product_data.sku and product_data.sku != product.sku:
            existing_product = await self.product_repo.get_by_sku(
                sku=product_data.sku,
                tenant_id=tenant_id
            )
            if existing_product:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product with SKU '{product_data.sku}' already exists for this tenant"
                )
            product.sku = product_data.sku

        # Update fields if provided
        if product_data.name is not None:
            product.name = product_data.name
        if product_data.barcode is not None:
            product.barcode = product_data.barcode
        if product_data.custom_attributes is not None:
            product.custom_attributes = product_data.custom_attributes

        return await self.product_repo.update(product)

    async def delete_product(
        self,
        product_id: int,
        tenant_id: int
    ) -> None:
        """
        Delete a product.

        Args:
            product_id: ID of the product to delete
            tenant_id: ID of the tenant

        Raises:
            HTTPException: If product not found
        """
        product = await self.get_product(product_id, tenant_id)
        await self.product_repo.delete(product)
