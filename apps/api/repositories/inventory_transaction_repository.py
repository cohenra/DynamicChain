from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.inventory_transaction import InventoryTransaction, TransactionType


class InventoryTransactionRepository:
    """
    Repository for InventoryTransaction database operations.

    IMPORTANT: This is an append-only ledger. NEVER delete transactions.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, transaction: InventoryTransaction) -> InventoryTransaction:
        """
        Create a new inventory transaction.

        This is the only write operation for the ledger - transactions are immutable.
        """
        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)
        return await self.get_by_id(transaction.id, transaction.tenant_id)

    async def get_by_id(self, transaction_id: int, tenant_id: int) -> Optional[InventoryTransaction]:
        """Get a transaction by ID with tenant isolation."""
        result = await self.db.execute(
            select(InventoryTransaction)
            .options(
                selectinload(InventoryTransaction.product),
                selectinload(InventoryTransaction.inventory),
                selectinload(InventoryTransaction.from_location),
                selectinload(InventoryTransaction.to_location),
                selectinload(InventoryTransaction.performed_by_user)
            )
            .where(
                and_(
                    InventoryTransaction.id == transaction_id,
                    InventoryTransaction.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_transactions(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        inventory_id: Optional[int] = None,
        product_id: Optional[int] = None,
        transaction_type: Optional[TransactionType] = None,
        reference_doc: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[InventoryTransaction]:
        """List transactions with optional filters."""
        query = select(InventoryTransaction).options(
            selectinload(InventoryTransaction.product),
            selectinload(InventoryTransaction.inventory),
            selectinload(InventoryTransaction.from_location),
            selectinload(InventoryTransaction.to_location),
            selectinload(InventoryTransaction.performed_by_user)
        ).where(InventoryTransaction.tenant_id == tenant_id)

        # Apply filters
        if inventory_id is not None:
            query = query.where(InventoryTransaction.inventory_id == inventory_id)
        if product_id is not None:
            query = query.where(InventoryTransaction.product_id == product_id)
        if transaction_type is not None:
            query = query.where(InventoryTransaction.transaction_type == transaction_type)
        if reference_doc is not None:
            query = query.where(InventoryTransaction.reference_doc.ilike(f"%{reference_doc}%"))
        if start_date is not None:
            query = query.where(InventoryTransaction.timestamp >= start_date)
        if end_date is not None:
            query = query.where(InventoryTransaction.timestamp <= end_date)

        query = query.offset(skip).limit(limit).order_by(InventoryTransaction.timestamp.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_transactions_for_lpn(
        self,
        lpn: str,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[InventoryTransaction]:
        """Get all transactions for a specific LPN (by joining through inventory)."""
        from models.inventory import Inventory

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

    async def count(
        self,
        tenant_id: int,
        inventory_id: Optional[int] = None,
        product_id: Optional[int] = None,
        transaction_type: Optional[TransactionType] = None
    ) -> int:
        """Count transactions with optional filters."""
        from sqlalchemy import func

        query = select(func.count(InventoryTransaction.id)).where(
            InventoryTransaction.tenant_id == tenant_id
        )

        if inventory_id is not None:
            query = query.where(InventoryTransaction.inventory_id == inventory_id)
        if product_id is not None:
            query = query.where(InventoryTransaction.product_id == product_id)
        if transaction_type is not None:
            query = query.where(InventoryTransaction.transaction_type == transaction_type)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_latest_for_inventory(self, inventory_id: int) -> Optional[InventoryTransaction]:
        """Get the most recent transaction for a specific inventory item."""
        result = await self.db.execute(
            select(InventoryTransaction)
            .where(InventoryTransaction.inventory_id == inventory_id)
            .order_by(InventoryTransaction.timestamp.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def update(self, transaction: InventoryTransaction) -> InventoryTransaction:
        """Update an existing inventory transaction (use sparingly - ledger should be immutable)."""
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction
