from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.warehouse_repository import WarehouseRepository
from schemas.warehouse import WarehouseCreate, WarehouseUpdate
from models.warehouse import Warehouse


class WarehouseService:
    """Service for warehouse business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.warehouse_repo = WarehouseRepository(db)

    async def create_warehouse(
        self,
        warehouse_data: WarehouseCreate,
        tenant_id: int
    ) -> Warehouse:
        """
        Create a new warehouse with code uniqueness validation.

        Args:
            warehouse_data: Warehouse creation data
            tenant_id: ID of the tenant creating the warehouse

        Returns:
            Created Warehouse instance

        Raises:
            HTTPException: If code already exists for this tenant
        """
        # Check if code already exists for this tenant
        existing_warehouse = await self.warehouse_repo.get_by_code(
            code=warehouse_data.code,
            tenant_id=tenant_id
        )

        if existing_warehouse:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Warehouse with code '{warehouse_data.code}' already exists for this tenant"
            )

        # Create new warehouse
        warehouse = Warehouse(
            tenant_id=tenant_id,
            name=warehouse_data.name,
            code=warehouse_data.code,
            address=warehouse_data.address
        )

        return await self.warehouse_repo.create(warehouse)

    async def get_warehouse(
        self,
        warehouse_id: int,
        tenant_id: int
    ) -> Warehouse:
        """
        Get a warehouse by ID with tenant isolation.

        Args:
            warehouse_id: ID of the warehouse
            tenant_id: ID of the tenant

        Returns:
            Warehouse instance

        Raises:
            HTTPException: If warehouse not found
        """
        warehouse = await self.warehouse_repo.get_by_id(
            warehouse_id=warehouse_id,
            tenant_id=tenant_id
        )

        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Warehouse with ID {warehouse_id} not found"
            )

        return warehouse

    async def list_warehouses(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Warehouse]:
        """
        List all warehouses for a tenant with pagination.

        Args:
            tenant_id: ID of the tenant
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of Warehouse instances
        """
        return await self.warehouse_repo.list_warehouses(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit
        )

    async def update_warehouse(
        self,
        warehouse_id: int,
        warehouse_data: WarehouseUpdate,
        tenant_id: int
    ) -> Warehouse:
        """
        Update an existing warehouse.

        Args:
            warehouse_id: ID of the warehouse to update
            warehouse_data: Warehouse update data
            tenant_id: ID of the tenant

        Returns:
            Updated Warehouse instance

        Raises:
            HTTPException: If warehouse not found or code conflict
        """
        # Get existing warehouse
        warehouse = await self.get_warehouse(warehouse_id, tenant_id)

        # Check code uniqueness if code is being updated
        if warehouse_data.code and warehouse_data.code != warehouse.code:
            existing_warehouse = await self.warehouse_repo.get_by_code(
                code=warehouse_data.code,
                tenant_id=tenant_id
            )
            if existing_warehouse:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Warehouse with code '{warehouse_data.code}' already exists for this tenant"
                )
            warehouse.code = warehouse_data.code

        # Update fields if provided
        if warehouse_data.name is not None:
            warehouse.name = warehouse_data.name
        if warehouse_data.address is not None:
            warehouse.address = warehouse_data.address

        return await self.warehouse_repo.update(warehouse)

    async def delete_warehouse(
        self,
        warehouse_id: int,
        tenant_id: int
    ) -> None:
        """
        Delete a warehouse.

        Args:
            warehouse_id: ID of the warehouse to delete
            tenant_id: ID of the tenant

        Raises:
            HTTPException: If warehouse not found
        """
        warehouse = await self.get_warehouse(warehouse_id, tenant_id)
        await self.warehouse_repo.delete(warehouse)
