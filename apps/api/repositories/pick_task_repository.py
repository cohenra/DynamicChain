from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.pick_task import PickTask, PickTaskStatus


class PickTaskRepository:
    """Repository for pick task operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, task: PickTask) -> PickTask:
        """Create a new pick task."""
        self.db.add(task)
        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def get_by_id(
        self,
        task_id: int,
    ) -> Optional[PickTask]:
        """Get pick task by ID."""
        stmt = select(PickTask).where(PickTask.id == task_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_wave(
        self,
        wave_id: int,
        status: Optional[PickTaskStatus] = None
    ) -> List[PickTask]:
        """List all pick tasks for a specific wave."""
        stmt = select(PickTask).where(PickTask.wave_id == wave_id)

        if status:
            stmt = stmt.where(PickTask.status == status)

        stmt = stmt.order_by(PickTask.created_at)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_order(
        self,
        order_id: int,
        status: Optional[PickTaskStatus] = None
    ) -> List[PickTask]:
        """List all pick tasks for a specific order."""
        stmt = select(PickTask).where(PickTask.order_id == order_id)

        if status:
            stmt = stmt.where(PickTask.status == status)

        stmt = stmt.order_by(PickTask.created_at)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_user(
        self,
        user_id: int,
        status: Optional[PickTaskStatus] = None
    ) -> List[PickTask]:
        """List all pick tasks assigned to a specific user."""
        stmt = select(PickTask).where(PickTask.assigned_to_user_id == user_id)

        if status:
            stmt = stmt.where(PickTask.status == status)

        stmt = stmt.order_by(PickTask.created_at)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, task: PickTask) -> PickTask:
        """Update a pick task."""
        await self.db.flush()
        await self.db.refresh(task)
        return task
