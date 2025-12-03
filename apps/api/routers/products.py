from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductUOMInfo
from services.product_service import ProductService
from auth.dependencies import get_current_user
from models.user import User


router = APIRouter(prefix="/api/products", tags=["Products"])


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductResponse:
    """
    Create a new product.

    Creates a product for the authenticated user's tenant. SKU must be unique per tenant.

    Args:
        product_data: Product creation data including SKU, name, and custom attributes
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ProductResponse: Created product with all fields

    Raises:
        400: If SKU already exists for this tenant
        401: If user is not authenticated
    """
    product_service = ProductService(db)
    product = await product_service.create_product(
        product_data=product_data,
        tenant_id=current_user.tenant_id
    )
    return ProductResponse.model_validate(product)


@router.get("/", response_model=List[ProductResponse])
async def list_products(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    depositor_id: int | None = Query(None, description="Filter by depositor ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[ProductResponse]:
    """
    List all products for the authenticated user's tenant.

    Supports pagination via skip and limit parameters.
    Can filter by depositor_id to get products belonging to a specific depositor.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        depositor_id: Optional depositor ID to filter products
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[ProductResponse]: List of products for this tenant

    Raises:
        401: If user is not authenticated
    """
    product_service = ProductService(db)
    products = await product_service.list_products(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        depositor_id=depositor_id
    )

    # Manually construct responses to include UOM info
    result = []
    for product in products:
        uoms_info = [
            ProductUOMInfo(
                id=uom.id,
                uom_id=uom.uom_id,
                uom_name=uom.uom.name,
                uom_code=uom.uom.code,
                conversion_factor=uom.conversion_factor,
                barcode=uom.barcode
            )
            for uom in product.uoms
        ]
        product_dict = {
            "id": product.id,
            "tenant_id": product.tenant_id,
            "depositor_id": product.depositor_id,
            "sku": product.sku,
            "name": product.name,
            "barcode": product.barcode,
            "base_uom_id": product.base_uom_id,
            "custom_attributes": product.custom_attributes,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "uoms": uoms_info
        }
        result.append(ProductResponse(**product_dict))

    return result


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductResponse:
    """
    Get a specific product by ID.

    Retrieves product details with tenant isolation - users can only access
    products belonging to their tenant.

    Args:
        product_id: ID of the product to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ProductResponse: Product details

    Raises:
        401: If user is not authenticated
        404: If product not found or doesn't belong to user's tenant
    """
    product_service = ProductService(db)
    product = await product_service.get_product(
        product_id=product_id,
        tenant_id=current_user.tenant_id
    )
    return ProductResponse.model_validate(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductResponse:
    """
    Update an existing product.

    Updates product fields. SKU uniqueness is enforced if SKU is being changed.
    Only products belonging to the user's tenant can be updated.

    Args:
        product_id: ID of the product to update
        product_data: Product update data (partial updates supported)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ProductResponse: Updated product details

    Raises:
        400: If new SKU already exists for this tenant
        401: If user is not authenticated
        404: If product not found or doesn't belong to user's tenant
    """
    product_service = ProductService(db)
    product = await product_service.update_product(
        product_id=product_id,
        product_data=product_data,
        tenant_id=current_user.tenant_id
    )
    return ProductResponse.model_validate(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a product.

    Permanently deletes a product. Only products belonging to the user's tenant
    can be deleted.

    Args:
        product_id: ID of the product to delete
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        None: 204 No Content on success

    Raises:
        401: If user is not authenticated
        404: If product not found or doesn't belong to user's tenant
    """
    product_service = ProductService(db)
    await product_service.delete_product(
        product_id=product_id,
        tenant_id=current_user.tenant_id
    )
