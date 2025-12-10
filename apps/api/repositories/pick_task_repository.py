from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.pick_task import PickTask, PickTaskStatus
from repositories.base_repository import BaseRepository

class PickTaskRepository(BaseRepository[PickTask]):
    """Repository for pick task operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, PickTask)

    async def get_by_id(self, id: int) -> Optional[PickTask]:
        # Task ID is global unique, no tenant_id needed for lookup usually, but safer with base if we had tenant_id on task
        # PickTask table DOES NOT have tenant_id column in the model provided earlier (it links to order/wave)
        # So we keep custom get_by_id
        stmt = select(PickTask).where(PickTask.id == id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_wave(
        self,
        wave_id: int,
        status: Optional[PickTaskStatus] = None
    ) -> List[PickTask]:
        stmt = select(PickTask).where(PickTask.wave_id == wave_id)
        if status:
            stmt = stmt.where(PickTask.status == status)
        stmt = stmt.order_by(PickTask.created_at)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # list_by_order, list_by_user - נשארים אותו דבר כי אלו פילטרים ספציפיים
    async def list_by_order(self, order_id: int, status: Optional[PickTaskStatus] = None) -> List[PickTask]:
        stmt = select(PickTask).where(PickTask.order_id == order_id)
        if status:
            stmt = stmt.where(PickTask.status == status)
        stmt = stmt.order_by(PickTask.created_at)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_user(self, user_id: int, status: Optional[PickTaskStatus] = None) -> List[PickTask]:
        stmt = select(PickTask).where(PickTask.assigned_to_user_id == user_id)
        if status:
            stmt = stmt.where(PickTask.status == status)
        stmt = stmt.order_by(PickTask.created_at)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())