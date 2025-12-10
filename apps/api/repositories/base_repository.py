from typing import Generic, TypeVar, Optional, List, Type, Any, Union
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

# Generic type for the model
ModelType = TypeVar("ModelType", bound=DeclarativeBase)


class BaseRepository(Generic[ModelType]):
    """
    Generic base repository for common CRUD operations.
    All repositories should inherit from this class to avoid code duplication.
    """

    def __init__(self, db: AsyncSession, model: Type[ModelType]):
        self.db = db
        self.model = model

    async def create(self, instance: ModelType) -> ModelType:
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
        order_by: Optional[Union[Any, tuple, list]] = None
    ) -> List[ModelType]:
        query = select(self.model).where(self.model.tenant_id == tenant_id)

        if filters:
            for filter_condition in filters:
                query = query.where(filter_condition)

        if options:
            query = query.options(*options)

        if order_by is not None:
            # FIX: Handle multiple order_by clauses (tuple/list)
            if isinstance(order_by, (tuple, list)):
                query = query.order_by(*order_by)
            else:
                query = query.order_by(order_by)
        else:
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
        query = select(func.count(self.model.id)).where(
            self.model.tenant_id == tenant_id
        )

        if filters:
            for filter_condition in filters:
                query = query.where(filter_condition)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def update(self, instance: ModelType) -> ModelType:
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def delete(self, instance: ModelType) -> None:
        await self.db.delete(instance)
        await self.db.flush()