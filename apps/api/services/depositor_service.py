from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from repositories.depositor_repository import DepositorRepository
from schemas.depositor import DepositorCreate, DepositorUpdate
from models.depositor import Depositor


class DepositorService:
    """Service for depositor business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.depositor_repo = DepositorRepository(db)

    async def create_depositor(
        self,
        depositor_data: DepositorCreate,
        tenant_id: int
    ) -> Depositor:
        """
        Create a new depositor with code uniqueness validation.

        Args:
            depositor_data: Depositor creation data
            tenant_id: ID of the tenant creating the depositor

        Returns:
            Created Depositor instance

        Raises:
            HTTPException: If code already exists for this tenant
        """
        # Check if code already exists for this tenant
        existing_depositor = await self.depositor_repo.get_by_code(
            code=depositor_data.code,
            tenant_id=tenant_id
        )

        if existing_depositor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Depositor with code '{depositor_data.code}' already exists for this tenant"
            )

        # Create new depositor
        depositor = Depositor(
            tenant_id=tenant_id,
            name=depositor_data.name,
            code=depositor_data.code,
            contact_info=depositor_data.contact_info
        )

        return await self.depositor_repo.create(depositor)

    async def get_depositor(
        self,
        depositor_id: int,
        tenant_id: int
    ) -> Depositor:
        """
        Get a depositor by ID with tenant isolation.

        Args:
            depositor_id: ID of the depositor
            tenant_id: ID of the tenant

        Returns:
            Depositor instance

        Raises:
            HTTPException: If depositor not found
        """
        depositor = await self.depositor_repo.get_by_id(
            depositor_id=depositor_id,
            tenant_id=tenant_id
        )

        if not depositor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Depositor with ID {depositor_id} not found"
            )

        return depositor

    async def list_depositors(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Depositor]:
        """
        List all depositors for a tenant with pagination.

        Args:
            tenant_id: ID of the tenant
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of Depositor instances
        """
        return await self.depositor_repo.list_depositors(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit
        )

    async def update_depositor(
        self,
        depositor_id: int,
        depositor_data: DepositorUpdate,
        tenant_id: int
    ) -> Depositor:
        """
        Update an existing depositor.

        Args:
            depositor_id: ID of the depositor to update
            depositor_data: Depositor update data
            tenant_id: ID of the tenant

        Returns:
            Updated Depositor instance

        Raises:
            HTTPException: If depositor not found or code conflict
        """
        # Get existing depositor
        depositor = await self.get_depositor(depositor_id, tenant_id)

        # Check code uniqueness if code is being updated
        if depositor_data.code and depositor_data.code != depositor.code:
            existing_depositor = await self.depositor_repo.get_by_code(
                code=depositor_data.code,
                tenant_id=tenant_id
            )
            if existing_depositor:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Depositor with code '{depositor_data.code}' already exists for this tenant"
                )
            depositor.code = depositor_data.code

        # Update fields if provided
        if depositor_data.name is not None:
            depositor.name = depositor_data.name
        if depositor_data.contact_info is not None:
            depositor.contact_info = depositor_data.contact_info

        return await self.depositor_repo.update(depositor)

    async def delete_depositor(
        self,
        depositor_id: int,
        tenant_id: int
    ) -> None:
        """
        Delete a depositor.

        Args:
            depositor_id: ID of the depositor to delete
            tenant_id: ID of the tenant

        Raises:
            HTTPException: If depositor not found
        """
        depositor = await self.get_depositor(depositor_id, tenant_id)
        await self.depositor_repo.delete(depositor)
