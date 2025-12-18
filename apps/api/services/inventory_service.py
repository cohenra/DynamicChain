from typing import List, Optional
from datetime import datetime
from decimal import Decimal
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from repositories.inventory_repository import InventoryRepository
from repositories.inventory_transaction_repository import InventoryTransactionRepository
from repositories.product_repository import ProductRepository
from repositories.depositor_repository import DepositorRepository
from models.inventory import Inventory, InventoryStatus
from models.inventory_transaction import InventoryTransaction, TransactionType
from schemas.inventory import InventoryReceiveRequest, InventoryMoveRequest, InventoryAdjustRequest, InventoryStatusChangeRequest


class InventoryService:
    """Service for inventory business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.inventory_repo = InventoryRepository(db)
        self.transaction_repo = InventoryTransactionRepository(db)
        self.product_repo = ProductRepository(db)

    def _generate_lpn(self) -> str:
        """Generate a unique License Plate Number."""
        return f"LPN-{uuid.uuid4().hex[:12].upper()}"

    async def receive_stock(
        self,
        receive_data: InventoryReceiveRequest,
        tenant_id: int,
        user_id: int,
        inbound_shipment_id: Optional[int] = None
    ) -> Inventory:
        """
        Receive new stock into the warehouse with inventory consolidation.
        """
        # Validate product exists and belongs to tenant
        product = await self.product_repo.get_by_id(
            product_id=receive_data.product_id,
            tenant_id=tenant_id
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {receive_data.product_id} not found"
            )

        # Validate depositor exists
        from repositories.depositor_repository import DepositorRepository
        depositor_repo = DepositorRepository(self.db)
        depositor = await depositor_repo.get_by_id(
            id=receive_data.depositor_id,
            tenant_id=tenant_id
        )
        if not depositor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Depositor with ID {receive_data.depositor_id} not found"
            )

        # Validate location exists
        from repositories.location_repository import LocationRepository
        location_repo = LocationRepository(self.db)
        location = await location_repo.get_by_id(
            id=receive_data.location_id,
            tenant_id=tenant_id
        )
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location with ID {receive_data.location_id} not found"
            )

        # Atomic transaction
        async with self.db.begin_nested():
            now = datetime.utcnow()

            # Check for existing inventory (Consolidation)
            from sqlalchemy import select, and_
            consolidation_query = select(Inventory).where(
                and_(
                    Inventory.tenant_id == tenant_id,
                    Inventory.product_id == receive_data.product_id,
                    Inventory.location_id == receive_data.location_id,
                    Inventory.depositor_id == receive_data.depositor_id,
                    Inventory.batch_number == receive_data.batch_number,
                    Inventory.expiry_date == receive_data.expiry_date,
                    Inventory.status == InventoryStatus.AVAILABLE
                )
            ).with_for_update()

            result = await self.db.execute(consolidation_query)
            existing_inventory = result.scalar_one_or_none()

            if existing_inventory:
                # Update existing
                existing_inventory.quantity += receive_data.quantity
                existing_inventory.updated_at = now
                await self.db.flush()
                await self.db.refresh(existing_inventory)
                created_inventory = existing_inventory
                lpn = existing_inventory.lpn
            else:
                # Create NEW
                lpn = receive_data.lpn
                if not lpn:
                    lpn = self._generate_lpn()
                else:
                    existing_lpn_inventory = await self.inventory_repo.get_by_lpn(
                        lpn=lpn,
                        tenant_id=tenant_id
                    )
                    if existing_lpn_inventory:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"LPN '{lpn}' already exists for this tenant"
                        )

                inventory = Inventory(
                    tenant_id=tenant_id,
                    depositor_id=receive_data.depositor_id,
                    product_id=receive_data.product_id,
                    location_id=receive_data.location_id,
                    lpn=lpn,
                    quantity=receive_data.quantity,
                    status=InventoryStatus.AVAILABLE,
                    batch_number=receive_data.batch_number,
                    expiry_date=receive_data.expiry_date,
                    fifo_date=now,
                    created_at=now,
                    updated_at=now
                )

                created_inventory = await self.inventory_repo.create(inventory)

            # Create transaction
            transaction = InventoryTransaction(
                tenant_id=tenant_id,
                transaction_type=TransactionType.INBOUND_RECEIVE,
                product_id=receive_data.product_id,
                from_location_id=None,
                to_location_id=receive_data.location_id,
                inventory_id=created_inventory.id,
                quantity=receive_data.quantity,
                reference_doc=receive_data.reference_doc,
                performed_by=user_id,
                inbound_shipment_id=inbound_shipment_id,
                timestamp=now,
                billing_metadata={
                    "operation": "receive",
                    "lpn": lpn,
                    "batch_number": receive_data.batch_number,
                    "expiry_date": receive_data.expiry_date.isoformat() if receive_data.expiry_date else None,
                    "consolidated": existing_inventory is not None
                }
            )

            await self.transaction_repo.create(transaction)

        return await self.get_inventory(created_inventory.id, tenant_id)

    async def get_inventory(self, inventory_id: int, tenant_id: int) -> Inventory:
        inventory = await self.inventory_repo.get_by_id(inventory_id, tenant_id)
        if not inventory:
            raise HTTPException(status_code=404, detail=f"Inventory {inventory_id} not found")
        return inventory

    async def get_inventory_by_lpn(self, lpn: str, tenant_id: int) -> Inventory:
        inventory = await self.inventory_repo.get_by_lpn(lpn, tenant_id)
        if not inventory:
            raise HTTPException(status_code=404, detail=f"Inventory LPN {lpn} not found")
        return inventory

    async def list_inventory(self, tenant_id: int, skip: int=0, limit: int=100, product_id: Optional[int]=None, location_id: Optional[int]=None, depositor_id: Optional[int]=None, status: Optional[InventoryStatus]=None, lpn: Optional[str]=None) -> List[Inventory]:
        return await self.inventory_repo.list_inventory(tenant_id, skip, limit, product_id, location_id, depositor_id, status, lpn)

    async def move_stock(self, move_data: InventoryMoveRequest, tenant_id: int, user_id: int) -> Inventory:
        """
        Move stock from one location to another with consolidation support and safety checks.
        """
        from sqlalchemy import select, and_

        # Get source inventory with lock
        source_inventory = await self.inventory_repo.get_by_lpn_with_lock(move_data.lpn, tenant_id)
        if not source_inventory:
            raise HTTPException(status_code=404, detail=f"Inventory {move_data.lpn} not found")

        # Validate destination location
        from repositories.location_repository import LocationRepository
        location_repo = LocationRepository(self.db)
        to_location = await location_repo.get_by_id(id=move_data.to_location_id, tenant_id=tenant_id)
        if not to_location:
            raise HTTPException(status_code=404, detail="Destination location not found")

        # Determine move quantity
        move_qty = move_data.quantity if move_data.quantity else source_inventory.quantity

        # Validate move quantity
        if move_qty <= 0:
            raise HTTPException(status_code=400, detail="Move quantity must be positive")
        if move_qty > source_inventory.quantity:
            raise HTTPException(status_code=400, detail="Move quantity exceeds available quantity")

        from_location_id = source_inventory.location_id
        now = datetime.utcnow()

        async with self.db.begin_nested():
            # Check if destination inventory already exists for CONSOLIDATION
            consolidation_query = select(Inventory).where(
                and_(
                    Inventory.tenant_id == tenant_id,
                    Inventory.product_id == source_inventory.product_id,
                    Inventory.location_id == move_data.to_location_id,
                    Inventory.depositor_id == source_inventory.depositor_id,
                    Inventory.batch_number == source_inventory.batch_number,
                    Inventory.expiry_date == source_inventory.expiry_date,
                    Inventory.status == InventoryStatus.AVAILABLE,
                    Inventory.id != source_inventory.id  # Don't match self
                )
            ).with_for_update()

            result = await self.db.execute(consolidation_query)
            target_inventory = result.scalar_one_or_none()

            is_full_move = move_qty >= source_inventory.quantity
            consolidated = False

            # FIX: Check if source has allocations. If so, we CANNOT delete/merge safely without re-pointing allocations.
            # Safety rule: Do not consolidate if source is allocated. Just move it.
            has_allocation = source_inventory.allocated_quantity > 0

            if target_inventory and not has_allocation:
                # CONSOLIDATION: Add quantity to existing inventory at destination
                target_inventory.quantity += move_qty
                target_inventory.updated_at = now

                if is_full_move:
                    # Full move + merge: Delete source inventory
                    await self.inventory_repo.delete(source_inventory)
                else:
                    # Partial move + merge: Decrement source
                    source_inventory.quantity -= move_qty
                    source_inventory.updated_at = now
                    await self.inventory_repo.update(source_inventory)

                await self.inventory_repo.update(target_inventory)
                result_inventory = target_inventory
                consolidated = True

            elif is_full_move:
                # FULL MOVE (no consolidation): Simply update location
                # This preserves ID and allocations
                source_inventory.location_id = move_data.to_location_id
                source_inventory.updated_at = now
                result_inventory = await self.inventory_repo.update(source_inventory)

            else:
                # PARTIAL MOVE (split): Create new inventory at destination
                source_inventory.quantity -= move_qty
                source_inventory.updated_at = now
                await self.inventory_repo.update(source_inventory)

                # Create new inventory record at destination
                new_lpn = self._generate_lpn()
                new_inventory = Inventory(
                    tenant_id=tenant_id,
                    depositor_id=source_inventory.depositor_id,
                    product_id=source_inventory.product_id,
                    location_id=move_data.to_location_id,
                    lpn=new_lpn,
                    quantity=move_qty,
                    allocated_quantity=Decimal('0'),
                    status=InventoryStatus.AVAILABLE,
                    batch_number=source_inventory.batch_number,
                    expiry_date=source_inventory.expiry_date,
                    fifo_date=source_inventory.fifo_date,
                    created_at=now,
                    updated_at=now
                )
                result_inventory = await self.inventory_repo.create(new_inventory)

            # Create transaction record
            transaction = InventoryTransaction(
                tenant_id=tenant_id,
                transaction_type=TransactionType.MOVE,
                product_id=source_inventory.product_id,
                from_location_id=from_location_id,
                to_location_id=move_data.to_location_id,
                inventory_id=result_inventory.id,
                quantity=move_qty,
                reference_doc=move_data.reference_doc,
                performed_by=user_id,
                timestamp=now,
                billing_metadata={
                    "operation": "move",
                    "partial": not is_full_move,
                    "consolidated": consolidated,
                    "source_lpn": move_data.lpn
                }
            )
            await self.transaction_repo.create(transaction)

        return await self.get_inventory(result_inventory.id, tenant_id)

    async def adjust_stock(self, adjust_data: InventoryAdjustRequest, tenant_id: int, user_id: int) -> Inventory:
        inventory = await self.inventory_repo.get_by_lpn_with_lock(adjust_data.lpn, tenant_id)
        if not inventory:
            raise HTTPException(status_code=404, detail="Inventory not found")
        
        if adjust_data.quantity < 0:
            raise HTTPException(status_code=400, detail="Negative quantity")

        old_qty = inventory.quantity
        inventory.quantity = adjust_data.quantity
        inventory.updated_at = datetime.utcnow()
        updated = await self.inventory_repo.update(inventory)

        transaction = InventoryTransaction(
            tenant_id=tenant_id,
            transaction_type=TransactionType.ADJUSTMENT,
            product_id=inventory.product_id,
            inventory_id=inventory.id,
            quantity=abs(adjust_data.quantity - old_qty),
            reference_doc=adjust_data.reference_doc,
            performed_by=user_id,
            timestamp=datetime.utcnow(),
            billing_metadata={"reason": adjust_data.reason}
        )
        await self.transaction_repo.create(transaction)
        
        return await self.get_inventory(updated.id, tenant_id)

    async def correct_transaction(self, original_transaction_id: int, new_quantity: Decimal, tenant_id: int, user_id: int, reason: Optional[str] = None) -> InventoryTransaction:
        original = await self.transaction_repo.get_by_id(original_transaction_id, tenant_id)
        if not original: raise HTTPException(404, "Transaction not found")

        diff = new_quantity - original.quantity
        if diff == 0: raise HTTPException(400, "No change in quantity")

        inv = await self.inventory_repo.get_by_id_with_lock(original.inventory_id, tenant_id)
        if not inv: raise HTTPException(404, "Inventory not found")

        inv.quantity += diff
        if inv.quantity < 0: raise HTTPException(400, "Negative inventory result")
        await self.inventory_repo.update(inv)

        correction = InventoryTransaction(
            tenant_id=tenant_id,
            transaction_type=TransactionType.CORRECTION,
            product_id=original.product_id,
            inventory_id=original.inventory_id,
            quantity=abs(diff),
            performed_by=user_id,
            timestamp=datetime.utcnow(),
            billing_metadata={"reason": reason, "original_tx": original_transaction_id}
        )
        return await self.transaction_repo.create(correction)

    async def get_available_quantity(
        self,
        product_id: int,
        tenant_id: int,
        location_id: Optional[int] = None,
        depositor_id: Optional[int] = None
    ) -> Decimal:
        """
        Get available quantity for a product.
        Available = quantity - allocated_quantity (prevents double-booking)
        """
        from sqlalchemy import select, func, and_

        conditions = [
            Inventory.tenant_id == tenant_id,
            Inventory.product_id == product_id,
            Inventory.status == InventoryStatus.AVAILABLE
        ]

        if location_id:
            conditions.append(Inventory.location_id == location_id)
        if depositor_id:
            conditions.append(Inventory.depositor_id == depositor_id)

        stmt = select(
            func.coalesce(
                func.sum(Inventory.quantity - Inventory.allocated_quantity),
                Decimal('0')
            )
        ).where(and_(*conditions))

        result = await self.db.execute(stmt)
        available = result.scalar_one()
        return Decimal(str(available)) if available else Decimal('0')

    async def move_stock_partial(
        self,
        move_data: InventoryMoveRequest,
        tenant_id: int,
        user_id: int
    ) -> Inventory:
        """
        Move stock with support for partial moves (split logic).
        """
        from sqlalchemy import select, and_

        # Get source inventory with lock
        source_inventory = await self.inventory_repo.get_by_lpn_with_lock(move_data.lpn, tenant_id)
        if not source_inventory:
            raise HTTPException(status_code=404, detail=f"Inventory {move_data.lpn} not found")

        # Validate destination location
        from repositories.location_repository import LocationRepository
        location_repo = LocationRepository(self.db)
        to_location = await location_repo.get_by_id(id=move_data.to_location_id, tenant_id=tenant_id)
        if not to_location:
            raise HTTPException(status_code=404, detail="Destination location not found")

        move_qty = move_data.quantity if move_data.quantity else source_inventory.quantity

        # Validate move quantity
        if move_qty <= 0:
            raise HTTPException(status_code=400, detail="Move quantity must be positive")
        if move_qty > source_inventory.quantity:
            raise HTTPException(status_code=400, detail="Move quantity exceeds available quantity")

        from_location_id = source_inventory.location_id
        now = datetime.utcnow()

        async with self.db.begin_nested():
            if move_qty < source_inventory.quantity:
                # PARTIAL MOVE: Split logic
                source_inventory.quantity -= move_qty
                source_inventory.updated_at = now
                await self.inventory_repo.update(source_inventory)

                consolidation_query = select(Inventory).where(
                    and_(
                        Inventory.tenant_id == tenant_id,
                        Inventory.product_id == source_inventory.product_id,
                        Inventory.location_id == move_data.to_location_id,
                        Inventory.depositor_id == source_inventory.depositor_id,
                        Inventory.batch_number == source_inventory.batch_number,
                        Inventory.expiry_date == source_inventory.expiry_date,
                        Inventory.status == InventoryStatus.AVAILABLE
                    )
                ).with_for_update()

                result = await self.db.execute(consolidation_query)
                target_inventory = result.scalar_one_or_none()

                if target_inventory:
                    # Consolidate
                    target_inventory.quantity += move_qty
                    target_inventory.updated_at = now
                    await self.inventory_repo.update(target_inventory)
                    result_inventory = target_inventory
                else:
                    # Create NEW
                    new_lpn = self._generate_lpn()
                    new_inventory = Inventory(
                        tenant_id=tenant_id,
                        depositor_id=source_inventory.depositor_id,
                        product_id=source_inventory.product_id,
                        location_id=move_data.to_location_id,
                        lpn=new_lpn,
                        quantity=move_qty,
                        allocated_quantity=Decimal('0'),
                        status=InventoryStatus.AVAILABLE,
                        batch_number=source_inventory.batch_number,
                        expiry_date=source_inventory.expiry_date,
                        fifo_date=source_inventory.fifo_date,
                        created_at=now,
                        updated_at=now
                    )
                    result_inventory = await self.inventory_repo.create(new_inventory)
            else:
                # FULL MOVE
                source_inventory.location_id = move_data.to_location_id
                source_inventory.updated_at = now
                result_inventory = await self.inventory_repo.update(source_inventory)

            transaction = InventoryTransaction(
                tenant_id=tenant_id,
                transaction_type=TransactionType.MOVE,
                product_id=source_inventory.product_id,
                from_location_id=from_location_id,
                to_location_id=move_data.to_location_id,
                inventory_id=result_inventory.id,
                quantity=move_qty,
                reference_doc=move_data.reference_doc,
                performed_by=user_id,
                timestamp=now,
                billing_metadata={
                    "operation": "move",
                    "partial": move_qty < source_inventory.quantity + move_qty,
                    "source_lpn": move_data.lpn
                }
            )
            await self.transaction_repo.create(transaction)

        return await self.get_inventory(result_inventory.id, tenant_id)