from typing import Optional, List
from decimal import Decimal
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.inventory import Inventory, InventoryStatus


class InventoryRepository:
    """Repository for Inventory database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, inventory: Inventory) -> Inventory:
        """Create a new inventory record."""
        self.db.add(inventory)
        await self.db.flush()
        await self.db.refresh(inventory)
        return await self.get_by_id(inventory.id, inventory.tenant_id)

    async def get_by_id(self, inventory_id: int, tenant_id: int) -> Optional[Inventory]:
        """Get an inventory record by ID with tenant isolation."""
        result = await self.db.execute(
            select(Inventory)
            .options(
                selectinload(Inventory.product),
                selectinload(Inventory.location),
                selectinload(Inventory.depositor)
            )
            .where(
                and_(
                    Inventory.id == inventory_id,
                    Inventory.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id_with_lock(self, inventory_id: int, tenant_id: int) -> Optional[Inventory]:
        """
        Get an inventory record by ID with row-level lock (SELECT FOR UPDATE).

        CRITICAL: Use this method when you need to prevent race conditions during
        inventory moves, adjustments, or any operation that modifies quantities.
        """
        result = await self.db.execute(
            select(Inventory)
            .options(
                selectinload(Inventory.product),
                selectinload(Inventory.location),
                selectinload(Inventory.depositor)
            )
            .where(
                and_(
                    Inventory.id == inventory_id,
                    Inventory.tenant_id == tenant_id
                )
            )
            .with_for_update()  # Row-level lock
        )
        return result.scalar_one_or_none()

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
        query = select(Inventory).options(
            selectinload(Inventory.product),
            selectinload(Inventory.location),
            selectinload(Inventory.depositor)
        ).where(Inventory.tenant_id == tenant_id)

        # Apply filters
        if product_id is not None:
            query = query.where(Inventory.product_id == product_id)
        if location_id is not None:
            query = query.where(Inventory.location_id == location_id)
        if depositor_id is not None:
            query = query.where(Inventory.depositor_id == depositor_id)
        if status is not None:
            query = query.where(Inventory.status == status)
        if lpn is not None:
            query = query.where(Inventory.lpn.ilike(f"%{lpn}%"))

        query = query.offset(skip).limit(limit).order_by(Inventory.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_available_quantity(
        self,
        product_id: int,
        tenant_id: int,
        location_id: Optional[int] = None
    ) -> Decimal:
        """
        Calculate total available quantity for a product.

        Args:
            product_id: Product ID
            tenant_id: Tenant ID
            location_id: Optional location filter

        Returns:
            Total quantity with status AVAILABLE
        """
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
        from sqlalchemy import func

        query = select(func.count(Inventory.id)).where(Inventory.tenant_id == tenant_id)

        if product_id is not None:
            query = query.where(Inventory.product_id == product_id)
        if location_id is not None:
            query = query.where(Inventory.location_id == location_id)
        if depositor_id is not None:
            query = query.where(Inventory.depositor_id == depositor_id)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def update(self, inventory: Inventory) -> Inventory:
        """Update an existing inventory record."""
        await self.db.flush()
        return await self.get_by_id(inventory.id, inventory.tenant_id)

    async def delete(self, inventory: Inventory) -> None:
        """Delete an inventory record."""
        await self.db.delete(inventory)
        await self.db.flush()
