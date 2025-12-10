from typing import Optional, List
from decimal import Decimal
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.inventory import Inventory, InventoryStatus
from repositories.base_repository import BaseRepository

class InventoryRepository(BaseRepository[Inventory]):
    """Repository for Inventory database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, Inventory)

    async def get_by_id(self, inventory_id: int, tenant_id: int) -> Optional[Inventory]:
        """Get an inventory record by ID with tenant isolation."""
        return await super().get_by_id(
            id=inventory_id,
            tenant_id=tenant_id,
            options=[
                selectinload(Inventory.product),
                selectinload(Inventory.location),
                selectinload(Inventory.depositor)
            ]
        )
    
    # get_by_id_with_lock - Inherited from BaseRepository, but if we need options loaded:
    async def get_by_id_with_lock(self, inventory_id: int, tenant_id: int) -> Optional[Inventory]:
        return await super().get_by_id_with_lock(
            id=inventory_id,
            tenant_id=tenant_id,
            options=[
                selectinload(Inventory.product),
                selectinload(Inventory.location),
                selectinload(Inventory.depositor)
            ]
        )

    async def get_by_lpn(self, lpn: str, tenant_id: int) -> Optional[Inventory]:
        """Get inventory by LPN within a tenant."""
        result = await self.db.execute(
            select(Inventory)
            .options(
                selectinload(Inventory.product),
                selectinload(Inventory.location),
                selectinload(Inventory.depositor)
            )
            .where(
                and_(
                    Inventory.lpn == lpn,
                    Inventory.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_lpn_with_lock(self, lpn: str, tenant_id: int) -> Optional[Inventory]:
        """Get inventory by LPN with row-level lock."""
        result = await self.db.execute(
            select(Inventory)
            .options(
                selectinload(Inventory.product),
                selectinload(Inventory.location),
                selectinload(Inventory.depositor)
            )
            .where(
                and_(
                    Inventory.lpn == lpn,
                    Inventory.tenant_id == tenant_id
                )
            )
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def list_inventory(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        product_id: Optional[int] = None,
        location_id: Optional[int] = None,
        depositor_id: Optional[int] = None,
        status: Optional[InventoryStatus] = None,
        lpn: Optional[str] = None
    ) -> List[Inventory]:
        """List inventory with optional filters."""
        filters = []
        if product_id: filters.append(Inventory.product_id == product_id)
        if location_id: filters.append(Inventory.location_id == location_id)
        if depositor_id: filters.append(Inventory.depositor_id == depositor_id)
        if status: filters.append(Inventory.status == status)
        if lpn: filters.append(Inventory.lpn.ilike(f"%{lpn}%"))

        options = [
            selectinload(Inventory.product),
            selectinload(Inventory.location),
            selectinload(Inventory.depositor)
        ]

        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=filters,
            options=options,
            order_by=Inventory.created_at.desc()
        )

    async def get_available_quantity(
        self,
        product_id: int,
        tenant_id: int,
        location_id: Optional[int] = None
    ) -> Decimal:
        """Calculate total available quantity for a product."""
        from sqlalchemy import func
        query = select(func.coalesce(func.sum(Inventory.quantity), 0)).where(
            and_(
                Inventory.tenant_id == tenant_id,
                Inventory.product_id == product_id,
                Inventory.status == InventoryStatus.AVAILABLE
            )
        )
        if location_id is not None:
            query = query.where(Inventory.location_id == location_id)

        result = await self.db.execute(query)
        return Decimal(str(result.scalar_one()))

    async def count(
        self,
        tenant_id: int,
        product_id: Optional[int] = None,
        location_id: Optional[int] = None,
        depositor_id: Optional[int] = None
    ) -> int:
        """Count inventory records with optional filters."""
        filters = []
        if product_id: filters.append(Inventory.product_id == product_id)
        if location_id: filters.append(Inventory.location_id == location_id)
        if depositor_id: filters.append(Inventory.depositor_id == depositor_id)

        return await super().count(tenant_id=tenant_id, filters=filters)