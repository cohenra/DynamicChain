from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.product_uom_repository import ProductUOMRepository
from repositories.product_repository import ProductRepository
from schemas.product_uom import ProductUOMCreate, ProductUOMUpdate
from models.product_uom import ProductUOM


class ProductUOMService:
    """Service for ProductUOM business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.product_uom_repo = ProductUOMRepository(db)
        self.product_repo = ProductRepository(db)

    async def create_product_uom(
        self,
        uom_data: ProductUOMCreate,
        tenant_id: int
    ) -> ProductUOM:
        """
        Create a new ProductUOM with validation.

        Args:
            uom_data: ProductUOM creation data
            tenant_id: ID of the tenant creating the UOM

        Returns:
            Created ProductUOM instance

        Raises:
            HTTPException: If product not found, UOM name already exists for product, or barcode conflict
        """
        # Verify product exists and belongs to tenant
        product = await self.product_repo.get_by_id(
            product_id=uom_data.product_id,
            tenant_id=tenant_id
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {uom_data.product_id} not found"
            )

        # Check if UOM name already exists for this product
        existing_uom = await self.product_uom_repo.get_by_product_and_name(
            product_id=uom_data.product_id,
            uom_name=uom_data.uom_name,
            tenant_id=tenant_id
        )
        if existing_uom:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"UOM '{uom_data.uom_name}' already exists for this product"
            )

        # Check barcode uniqueness if provided
        if uom_data.barcode:
            existing_barcode = await self.product_uom_repo.get_by_barcode(
                barcode=uom_data.barcode,
                tenant_id=tenant_id
            )
            if existing_barcode:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Barcode '{uom_data.barcode}' already exists for another product UOM"
                )

        # Compute volume if not provided but dimensions are
        volume = uom_data.compute_volume()

        # Create new ProductUOM
        product_uom = ProductUOM(
            tenant_id=tenant_id,
            product_id=uom_data.product_id,
            uom_name=uom_data.uom_name,
            conversion_factor=uom_data.conversion_factor,
            barcode=uom_data.barcode,
            length=uom_data.length,
            width=uom_data.width,
            height=uom_data.height,
            volume=volume,
            weight=uom_data.weight
        )

        return await self.product_uom_repo.create(product_uom)

    async def get_product_uom(
        self,
        uom_id: int,
        tenant_id: int
    ) -> ProductUOM:
        """
        Get a ProductUOM by ID with tenant isolation.

        Args:
            uom_id: ID of the ProductUOM
            tenant_id: ID of the tenant

        Returns:
            ProductUOM instance

        Raises:
            HTTPException: If ProductUOM not found
        """
        product_uom = await self.product_uom_repo.get_by_id(
            uom_id=uom_id,
            tenant_id=tenant_id
        )

        if not product_uom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ProductUOM with ID {uom_id} not found"
            )

        return product_uom

    async def list_product_uoms_by_product(
        self,
        product_id: int,
        tenant_id: int
    ) -> List[ProductUOM]:
        """
        List all ProductUOMs for a specific product.

        Args:
            product_id: ID of the product
            tenant_id: ID of the tenant

        Returns:
            List of ProductUOM instances

        Raises:
            HTTPException: If product not found
        """
        # Verify product exists and belongs to tenant
        product = await self.product_repo.get_by_id(
            product_id=product_id,
            tenant_id=tenant_id
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found"
            )

        return await self.product_uom_repo.list_by_product(
            product_id=product_id,
            tenant_id=tenant_id
        )

    async def list_all_product_uoms(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[ProductUOM]:
        """
        List all ProductUOMs for a tenant with pagination.

        Args:
            tenant_id: ID of the tenant
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of ProductUOM instances
        """
        return await self.product_uom_repo.list_all(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit
        )

    async def update_product_uom(
        self,
        uom_id: int,
        uom_data: ProductUOMUpdate,
        tenant_id: int
    ) -> ProductUOM:
        """
        Update an existing ProductUOM.

        Args:
            uom_id: ID of the ProductUOM to update
            uom_data: ProductUOM update data
            tenant_id: ID of the tenant

        Returns:
            Updated ProductUOM instance

        Raises:
            HTTPException: If ProductUOM not found or UOM name/barcode conflict
        """
        # Get existing ProductUOM
        product_uom = await self.get_product_uom(uom_id, tenant_id)

        # Check UOM name uniqueness if being updated
        if uom_data.uom_name and uom_data.uom_name != product_uom.uom_name:
            existing_uom = await self.product_uom_repo.get_by_product_and_name(
                product_id=product_uom.product_id,
                uom_name=uom_data.uom_name,
                tenant_id=tenant_id
            )
            if existing_uom:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"UOM '{uom_data.uom_name}' already exists for this product"
                )
            product_uom.uom_name = uom_data.uom_name

        # Check barcode uniqueness if being updated
        if uom_data.barcode and uom_data.barcode != product_uom.barcode:
            existing_barcode = await self.product_uom_repo.get_by_barcode(
                barcode=uom_data.barcode,
                tenant_id=tenant_id
            )
            if existing_barcode and existing_barcode.id != uom_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Barcode '{uom_data.barcode}' already exists for another product UOM"
                )
            product_uom.barcode = uom_data.barcode

        # Update fields if provided
        if uom_data.conversion_factor is not None:
            product_uom.conversion_factor = uom_data.conversion_factor
        if uom_data.length is not None:
            product_uom.length = uom_data.length
        if uom_data.width is not None:
            product_uom.width = uom_data.width
        if uom_data.height is not None:
            product_uom.height = uom_data.height
        if uom_data.weight is not None:
            product_uom.weight = uom_data.weight

        # Update volume if provided or recompute from dimensions
        if uom_data.volume is not None:
            product_uom.volume = uom_data.volume
        elif product_uom.length and product_uom.width and product_uom.height:
            product_uom.volume = product_uom.length * product_uom.width * product_uom.height

        return await self.product_uom_repo.update(product_uom)

    async def delete_product_uom(
        self,
        uom_id: int,
        tenant_id: int
    ) -> None:
        """
        Delete a ProductUOM.

        Args:
            uom_id: ID of the ProductUOM to delete
            tenant_id: ID of the tenant

        Raises:
            HTTPException: If ProductUOM not found
        """
        product_uom = await self.get_product_uom(uom_id, tenant_id)
        await self.product_uom_repo.delete(product_uom)
