from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.inventory_transaction import InventoryTransaction, TransactionType
from models.inventory import Inventory
from repositories.base_repository import BaseRepository

class InventoryTransactionRepository(BaseRepository[InventoryTransaction]):
    """
    Repository for InventoryTransaction database operations.
    Inherits create/get from BaseRepository.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(db, InventoryTransaction)

    async def list_transactions(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        inventory_id: Optional[int] = None,
        product_id: Optional[int] = None,
        transaction_type: Optional[TransactionType] = None,
        reference_doc: Optional[str] = None,
        inbound_shipment_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[InventoryTransaction]:
        """List transactions with optional filters using BaseRepository."""
        
        filters = []
        if inventory_id: filters.append(InventoryTransaction.inventory_id == inventory_id)
        if product_id: filters.append(InventoryTransaction.product_id == product_id)
        if transaction_type: filters.append(InventoryTransaction.transaction_type == transaction_type)
        if reference_doc: filters.append(InventoryTransaction.reference_doc.ilike(f"%{reference_doc}%"))
        if inbound_shipment_id: filters.append(InventoryTransaction.inbound_shipment_id == inbound_shipment_id)
        if start_date: filters.append(InventoryTransaction.timestamp >= start_date)
        if end_date: filters.append(InventoryTransaction.timestamp <= end_date)

        options = [
            selectinload(InventoryTransaction.product),
            selectinload(InventoryTransaction.inventory),
            selectinload(InventoryTransaction.from_location),
            selectinload(InventoryTransaction.to_location),
            selectinload(InventoryTransaction.performed_by_user)
        ]

        return await super().list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=filters,
            options=options,
            order_by=InventoryTransaction.timestamp.desc()
        )

    async def get_transactions_for_lpn(
        self,
        lpn: str,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[InventoryTransaction]:
        """Get all transactions for a specific LPN (Joined query)."""
        # שאילתה זו מורכבת מדי ל-Base ולכן נשארת כאן
        result = await self.db.execute(
            select(InventoryTransaction)
            .options(
                selectinload(InventoryTransaction.product),
                selectinload(InventoryTransaction.inventory),
                selectinload(InventoryTransaction.from_location),
                selectinload(InventoryTransaction.to_location),
                selectinload(InventoryTransaction.performed_by_user)
            )
            .join(Inventory, InventoryTransaction.inventory_id == Inventory.id)
            .where(
                and_(
                    Inventory.lpn == lpn,
                    Inventory.tenant_id == tenant_id
                )
            )
            .offset(skip)
            .limit(limit)
            .order_by(InventoryTransaction.timestamp.desc())
        )
        return list(result.scalars().all())

    async def get_latest_for_inventory(self, inventory_id: int) -> Optional[InventoryTransaction]:
        """Get the most recent transaction for a specific inventory item."""
        result = await self.db.execute(
            select(InventoryTransaction)
            .where(InventoryTransaction.inventory_id == inventory_id)
            .order_by(InventoryTransaction.timestamp.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()