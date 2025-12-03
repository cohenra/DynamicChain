from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.location_usage_definition_repository import LocationUsageDefinitionRepository
from schemas.location_usage_definition import LocationUsageDefinitionCreate, LocationUsageDefinitionUpdate
from models.location_usage_definition import LocationUsageDefinition


class LocationUsageDefinitionService:
    """Service for location usage definition business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.definition_repo = LocationUsageDefinitionRepository(db)

    async def create_definition(
        self,
        definition_data: LocationUsageDefinitionCreate,
        tenant_id: int
    ) -> LocationUsageDefinition:
        """
        Create a new location usage definition with code uniqueness validation.

        Args:
            definition_data: Location usage definition creation data
            tenant_id: ID of the tenant creating the definition

        Returns:
            Created LocationUsageDefinition instance

        Raises:
            HTTPException: If code already exists for this tenant
        """
        # Check if code already exists for this tenant
        existing = await self.definition_repo.get_by_code(
            code=definition_data.code,
            tenant_id=tenant_id
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Location usage with code '{definition_data.code}' already exists for this tenant"
            )

        # Create new definition
        definition = LocationUsageDefinition(
            tenant_id=tenant_id,
            name=definition_data.name,
            code=definition_data.code
        )

        return await self.definition_repo.create(definition)

    async def get_definition(
        self,
        definition_id: int,
        tenant_id: int
    ) -> LocationUsageDefinition:
        """
        Get a location usage definition by ID with tenant isolation.

        Args:
            definition_id: ID of the definition
            tenant_id: ID of the tenant

        Returns:
            LocationUsageDefinition instance

        Raises:
            HTTPException: If definition not found
        """
        definition = await self.definition_repo.get_by_id(
            definition_id=definition_id,
            tenant_id=tenant_id
        )

        if not definition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location usage definition with ID {definition_id} not found"
            )

        return definition

    async def list_definitions(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[LocationUsageDefinition]:
        """
        List all location usage definitions for a tenant with pagination.

        Args:
            tenant_id: ID of the tenant
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of LocationUsageDefinition instances
        """
        return await self.definition_repo.list_definitions(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit
        )

    async def update_definition(
        self,
        definition_id: int,
        definition_data: LocationUsageDefinitionUpdate,
        tenant_id: int
    ) -> LocationUsageDefinition:
        """
        Update an existing location usage definition.

        Args:
            definition_id: ID of the definition to update
            definition_data: Location usage definition update data
            tenant_id: ID of the tenant

        Returns:
            Updated LocationUsageDefinition instance

        Raises:
            HTTPException: If definition not found or code conflict
        """
        # Get existing definition
        definition = await self.get_definition(definition_id, tenant_id)

        # Check code uniqueness if code is being updated
        if definition_data.code and definition_data.code != definition.code:
            existing = await self.definition_repo.get_by_code(
                code=definition_data.code,
                tenant_id=tenant_id
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Location usage with code '{definition_data.code}' already exists for this tenant"
                )
            definition.code = definition_data.code

        # Update fields if provided
        if definition_data.name is not None:
            definition.name = definition_data.name

        return await self.definition_repo.update(definition)

    async def delete_definition(
        self,
        definition_id: int,
        tenant_id: int
    ) -> None:
        """
        Delete a location usage definition.

        Args:
            definition_id: ID of the definition to delete
            tenant_id: ID of the tenant

        Raises:
            HTTPException: If definition not found
        """
        definition = await self.get_definition(definition_id, tenant_id)
        await self.definition_repo.delete(definition)
