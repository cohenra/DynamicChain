from typing import Generic, TypeVar, Optional, List, Type, Any
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

# Generic type for the model
ModelType = TypeVar("ModelType", bound=DeclarativeBase)


class BaseRepository(Generic[ModelType]):
    """
    Generic base repository for common CRUD operations.
    All repositories should inherit from this class to avoid code duplication.

    Usage:
        class UserRepository(BaseRepository[User]):
            def __init__(self, db: AsyncSession):
                super().__init__(db, User)
    """

    def __init__(self, db: AsyncSession, model: Type[ModelType]):
        self.db = db
        self.model = model

    async def create(self, instance: ModelType) -> ModelType:
        """
        Create a new record in the database.

        Args:
            instance: The model instance to create

        Returns:
            The created instance with refreshed data
        """
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def get_by_id(
        self,
        id: int,
        tenant_id: int,
        options: Optional[List[Any]] = None
    ) -> Optional[ModelType]:
        """
        Get a record by ID with tenant isolation.

        Args:
            id: The record ID
            tenant_id: The tenant ID for isolation
            options: Optional list of SQLAlchemy load options (e.g., selectinload)

        Returns:
            The found record or None
        """
        query = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.tenant_id == tenant_id
            )
        )

        if options:
            query = query.options(*options)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id_with_lock(
        self,
        id: int,
        tenant_id: int,
        options: Optional[List[Any]] = None
    ) -> Optional[ModelType]:
        """
        Get a record by ID with row-level lock (SELECT FOR UPDATE).
        Use this to prevent race conditions.

        Args:
            id: The record ID
            tenant_id: The tenant ID for isolation
            options: Optional list of SQLAlchemy load options

        Returns:
            The found record or None (with lock held until commit/rollback)
        """
        query = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.tenant_id == tenant_id
            )
        ).with_for_update()

        if options:
            query = query.options(*options)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List[Any]] = None,
        options: Optional[List[Any]] = None,
        order_by: Optional[Any] = None
    ) -> List[ModelType]:
        """
        List records with pagination and optional filters.

        Args:
            tenant_id: The tenant ID for isolation
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            filters: Optional list of SQLAlchemy filter conditions
            options: Optional list of SQLAlchemy load options (e.g., selectinload)
            order_by: Optional SQLAlchemy order_by clause

        Returns:
            List of records
        """
        query = select(self.model).where(self.model.tenant_id == tenant_id)

        if filters:
            for filter_condition in filters:
                query = query.where(filter_condition)

        if options:
            query = query.options(*options)

        if order_by is not None:
            query = query.order_by(order_by)
        else:
            # Default ordering by created_at if available
            if hasattr(self.model, 'created_at'):
                query = query.order_by(self.model.created_at.desc())

        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(
        self,
        tenant_id: int,
        filters: Optional[List[Any]] = None
    ) -> int:
        """
        Count records with optional filters.

        Args:
            tenant_id: The tenant ID for isolation
            filters: Optional list of SQLAlchemy filter conditions

        Returns:
            Count of records
        """
        query = select(func.count(self.model.id)).where(
            self.model.tenant_id == tenant_id
        )

        if filters:
            for filter_condition in filters:
                query = query.where(filter_condition)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def update(self, instance: ModelType) -> ModelType:
        """
        Update an existing record.

        Args:
            instance: The model instance with updated values

        Returns:
            The updated instance
        """
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def delete(self, instance: ModelType) -> None:
        """
        Delete a record from the database.

        Args:
            instance: The model instance to delete
        """
        await self.db.delete(instance)
        await self.db.flush()
