from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.product_uom import ProductUOMCreate, ProductUOMUpdate, ProductUOMResponse
from services.product_uom_service import ProductUOMService
from auth.dependencies import get_current_user
from models.user import User


router = APIRouter(prefix="/api/product-uoms", tags=["Product UOMs"])


@router.post("/", response_model=ProductUOMResponse, status_code=status.HTTP_201_CREATED)
async def create_product_uom(
    uom_data: ProductUOMCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductUOMResponse:
    """
    Create a new Product UOM.

    Creates a unit of measure for a product. The UOM name must be unique per product,
    and barcode must be unique per tenant if provided.

    Args:
        uom_data: ProductUOM creation data including product_id, name, conversion factor, dimensions
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ProductUOMResponse: Created ProductUOM with all fields

    Raises:
        400: If UOM name already exists for this product or barcode conflict
        401: If user is not authenticated
        404: If product not found
    """
    product_uom_service = ProductUOMService(db)
    product_uom = await product_uom_service.create_product_uom(
        uom_data=uom_data,
        tenant_id=current_user.tenant_id
    )
    return ProductUOMResponse.model_validate(product_uom)


@router.get("/", response_model=List[ProductUOMResponse])
async def list_all_product_uoms(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[ProductUOMResponse]:
    """
    List all Product UOMs for the authenticated user's tenant.

    Supports pagination via skip and limit parameters.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[ProductUOMResponse]: List of ProductUOMs for this tenant

    Raises:
        401: If user is not authenticated
    """
    product_uom_service = ProductUOMService(db)
    product_uoms = await product_uom_service.list_all_product_uoms(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    return [ProductUOMResponse.model_validate(uom) for uom in product_uoms]


@router.get("/product/{product_id}", response_model=List[ProductUOMResponse])
async def list_product_uoms_by_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[ProductUOMResponse]:
    """
    List all Product UOMs for a specific product.

    Retrieves all UOMs for a given product, ordered by conversion factor.

    Args:
        product_id: ID of the product
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[ProductUOMResponse]: List of ProductUOMs for the product

    Raises:
        401: If user is not authenticated
        404: If product not found or doesn't belong to user's tenant
    """
    product_uom_service = ProductUOMService(db)
    product_uoms = await product_uom_service.list_product_uoms_by_product(
        product_id=product_id,
        tenant_id=current_user.tenant_id
    )

    # Manually construct responses to include UOM name and code
    result = []
    for uom in product_uoms:
        uom_dict = {
            "id": uom.id,
            "product_id": uom.product_id,
            "tenant_id": uom.tenant_id,
            "uom_id": uom.uom_id,
            "conversion_factor": uom.conversion_factor,
            "barcode": uom.barcode,
            "length": uom.length,
            "width": uom.width,
            "height": uom.height,
            "volume": uom.volume,
            "weight": uom.weight,
            "created_at": uom.created_at,
            "updated_at": uom.updated_at,
            "uom_name": uom.uom.name if uom.uom else None,
            "uom_code": uom.uom.code if uom.uom else None
        }
        result.append(ProductUOMResponse(**uom_dict))

    return result


@router.get("/{uom_id}", response_model=ProductUOMResponse)
async def get_product_uom(
    uom_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductUOMResponse:
    """
    Get a specific Product UOM by ID.

    Retrieves ProductUOM details with tenant isolation - users can only access
    UOMs belonging to their tenant.

    Args:
        uom_id: ID of the ProductUOM to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ProductUOMResponse: ProductUOM details

    Raises:
        401: If user is not authenticated
        404: If ProductUOM not found or doesn't belong to user's tenant
    """
    product_uom_service = ProductUOMService(db)
    product_uom = await product_uom_service.get_product_uom(
        uom_id=uom_id,
        tenant_id=current_user.tenant_id
    )
    return ProductUOMResponse.model_validate(product_uom)


@router.put("/{uom_id}", response_model=ProductUOMResponse)
async def update_product_uom(
    uom_id: int,
    uom_data: ProductUOMUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductUOMResponse:
    """
    Update an existing Product UOM.

    Updates ProductUOM fields. UOM name uniqueness per product and barcode uniqueness
    per tenant are enforced if being changed.

    Args:
        uom_id: ID of the ProductUOM to update
        uom_data: ProductUOM update data (partial updates supported)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ProductUOMResponse: Updated ProductUOM details

    Raises:
        400: If new UOM name already exists for this product or barcode conflict
        401: If user is not authenticated
        404: If ProductUOM not found or doesn't belong to user's tenant
    """
    product_uom_service = ProductUOMService(db)
    product_uom = await product_uom_service.update_product_uom(
        uom_id=uom_id,
        uom_data=uom_data,
        tenant_id=current_user.tenant_id
    )
    return ProductUOMResponse.model_validate(product_uom)


@router.delete("/{uom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_uom(
    uom_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a Product UOM.

    Permanently deletes a ProductUOM. Only UOMs belonging to the user's tenant
    can be deleted.

    Args:
        uom_id: ID of the ProductUOM to delete
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        None: 204 No Content on success

    Raises:
        401: If user is not authenticated
        404: If ProductUOM not found or doesn't belong to user's tenant
    """
    product_uom_service = ProductUOMService(db)
    await product_uom_service.delete_product_uom(
        uom_id=uom_id,
        tenant_id=current_user.tenant_id
    )
