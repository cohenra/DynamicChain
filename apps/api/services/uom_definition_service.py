from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.uom_definition_repository import UomDefinitionRepository
from schemas.uom_definition import UomDefinitionCreate, UomDefinitionUpdate
from models.uom_definition import UomDefinition


class UomDefinitionService:
    """Service for UOM definition business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.uom_definition_repo = UomDefinitionRepository(db)

    async def create_uom_definition(
        self,
        uom_definition_data: UomDefinitionCreate,
        tenant_id: int
    ) -> UomDefinition:
        """
        Create a new UOM definition with code uniqueness validation.

        Args:
            uom_definition_data: UOM definition creation data
            tenant_id: ID of the tenant creating the UOM definition

        Returns:
            Created UomDefinition instance

        Raises:
            HTTPException: If code already exists for this tenant
        """
        # Check if code already exists for this tenant
        existing_uom = await self.uom_definition_repo.get_by_code(
            code=uom_definition_data.code,
            tenant_id=tenant_id
        )

        if existing_uom:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"UOM with code '{uom_definition_data.code}' already exists for this tenant"
            )

        # Create new UOM definition
        uom_definition = UomDefinition(
            tenant_id=tenant_id,
            name=uom_definition_data.name,
            code=uom_definition_data.code
        )

        return await self.uom_definition_repo.create(uom_definition)

    async def get_uom_definition(
        self,
        uom_definition_id: int,
        tenant_id: int
    ) -> UomDefinition:
        """
        Get a UOM definition by ID with tenant isolation.

        Args:
            uom_definition_id: ID of the UOM definition
            tenant_id: ID of the tenant

        Returns:
            UomDefinition instance

        Raises:
            HTTPException: If UOM definition not found
        """
        uom_definition = await self.uom_definition_repo.get_by_id(
            uom_definition_id=uom_definition_id,
            tenant_id=tenant_id
        )

        if not uom_definition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"UOM definition with ID {uom_definition_id} not found"
            )

        return uom_definition

    async def list_uom_definitions(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[UomDefinition]:
        """
        List all UOM definitions for a tenant with pagination.

        Args:
            tenant_id: ID of the tenant
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of UomDefinition instances
        """
        return await self.uom_definition_repo.list_uom_definitions(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit
        )

    async def update_uom_definition(
        self,
        uom_definition_id: int,
        uom_definition_data: UomDefinitionUpdate,
        tenant_id: int
    ) -> UomDefinition:
        """
        Update an existing UOM definition.

        Args:
            uom_definition_id: ID of the UOM definition to update
            uom_definition_data: UOM definition update data
            tenant_id: ID of the tenant

        Returns:
            Updated UomDefinition instance

        Raises:
            HTTPException: If UOM definition not found or code conflict
        """
        # Get existing UOM definition
        uom_definition = await self.get_uom_definition(uom_definition_id, tenant_id)

        # Check code uniqueness if code is being updated
        if uom_definition_data.code and uom_definition_data.code != uom_definition.code:
            existing_uom = await self.uom_definition_repo.get_by_code(
                code=uom_definition_data.code,
                tenant_id=tenant_id
            )
            if existing_uom:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"UOM with code '{uom_definition_data.code}' already exists for this tenant"
                )
            uom_definition.code = uom_definition_data.code

        # Update fields if provided
        if uom_definition_data.name is not None:
            uom_definition.name = uom_definition_data.name

        return await self.uom_definition_repo.update(uom_definition)

    async def delete_uom_definition(
        self,
        uom_definition_id: int,
        tenant_id: int
    ) -> None:
        """
        Delete a UOM definition.

        Args:
            uom_definition_id: ID of the UOM definition to delete
            tenant_id: ID of the tenant

        Raises:
            HTTPException: If UOM definition not found
        """
        uom_definition = await self.get_uom_definition(uom_definition_id, tenant_id)
        await self.uom_definition_repo.delete(uom_definition)
