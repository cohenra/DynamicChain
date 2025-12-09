from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from models.outbound_order import OutboundOrder, OutboundOrderStatus
from models.outbound_line import OutboundLine
from models.outbound_wave import OutboundWave, OutboundWaveStatus
from models.pick_task import PickTask, PickTaskStatus
from models.inventory_transaction import InventoryTransaction, TransactionType
from repositories.outbound_order_repository import OutboundOrderRepository
from repositories.outbound_line_repository import OutboundLineRepository
from repositories.outbound_wave_repository import OutboundWaveRepository
from repositories.pick_task_repository import PickTaskRepository
from repositories.product_repository import ProductRepository
from repositories.inventory_repository import InventoryRepository
from repositories.inventory_transaction_repository import InventoryTransactionRepository
from services.allocation_service import AllocationService
from schemas.outbound import OutboundOrderCreate, OutboundWaveCreate

class OutboundService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.order_repo = OutboundOrderRepository(db)
        self.line_repo = OutboundLineRepository(db)
        self.wave_repo = OutboundWaveRepository(db)
        self.task_repo = PickTaskRepository(db)
        self.product_repo = ProductRepository(db)
        self.inventory_repo = InventoryRepository(db)
        self.transaction_repo = InventoryTransactionRepository(db)
        self.allocation_service = AllocationService(db)

    async def create_order(self, order_data: OutboundOrderCreate, tenant_id: int, user_id: int) -> OutboundOrder:
        # Validate products exist
        for line in order_data.lines:
            product = await self.product_repo.get_by_id(line.product_id)
            if not product or product.tenant_id != tenant_id:
                raise HTTPException(status_code=400, detail=f"Product {line.product_id} not found")

        # Create Order Header
        order = OutboundOrder(
            tenant_id=tenant_id,
            order_number=order_data.order_number,
            customer_id=order_data.customer_id,
            order_type=order_data.order_type,
            priority=order_data.priority,
            requested_delivery_date=order_data.requested_delivery_date,
            shipping_details=order_data.shipping_details,
            status=OutboundOrderStatus.DRAFT,
            created_by=user_id
        )
        created_order = await self.order_repo.create(order)

        # Create Lines
        for line_data in order_data.lines:
            line = OutboundLine(
                order_id=created_order.id,
                product_id=line_data.product_id,
                uom_id=line_data.uom_id,
                qty_ordered=line_data.qty_ordered,
                qty_allocated=0,
                qty_picked=0,
                constraints=line_data.constraints
            )
            await self.line_repo.create(line)

        return await self.order_repo.get_by_id(created_order.id, tenant_id)

    async def list_orders(
        self, 
        tenant_id: int, 
        skip: int = 0, 
        limit: int = 100, 
        status: Optional[str] = None,
        customer_id: Optional[int] = None,
        order_type: Optional[str] = None
    ) -> List[OutboundOrder]:
        # --- FIX: Changed from order_repo.list_orders to order_repo.list ---
        return await self.order_repo.list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            status=status,
            customer_id=customer_id,
            order_type=order_type
        )

    async def get_order(self, order_id: int, tenant_id: int) -> OutboundOrder:
        order = await self.order_repo.get_by_id(order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return order

    async def allocate_order(self, order_id: int, tenant_id: int, strategy_id: int) -> OutboundOrder:
        """
        Trigger allocation for a single order
        """
        # Validate order
        order = await self.get_order(order_id, tenant_id)
        if order.status not in [OutboundOrderStatus.DRAFT, OutboundOrderStatus.VERIFIED, OutboundOrderStatus.PLANNED]:
             raise HTTPException(status_code=400, detail=f"Cannot allocate order in status {order.status}")

        # Delegate to Allocation Service
        await self.allocation_service.allocate_order(order_id, strategy_id, tenant_id)
        
        return await self.get_order(order_id, tenant_id)

    async def release_order(self, order_id: int, tenant_id: int) -> OutboundOrder:
        """
        Release order to picking (Generating Tasks is done during allocation, this just updates status)
        """
        order = await self.get_order(order_id, tenant_id)
        
        if order.status != OutboundOrderStatus.PLANNED:
            # Allow releasing if it was PARTIAL allocated? For now strict check.
            # If we implement partial release, logic goes here.
            raise HTTPException(status_code=400, detail="Order must be PLANNED to release")

        # Update status to RELEASED
        order.status = OutboundOrderStatus.RELEASED
        await self.order_repo.update(order)
        
        # Update tasks status to PENDING (if they were created as 'PLANNED')
        # In our current logic, tasks are PENDING on creation, so they are ready.
        
        return order

    async def accept_shortages(self, order_id: int, tenant_id: int) -> OutboundOrder:
        """
        Accept that the order is partially allocated and release it.
        """
        order = await self.get_order(order_id, tenant_id)
        
        # Check if there are unallocated quantities
        has_shortages = any(line.qty_allocated < line.qty_ordered for line in order.lines)
        
        if not has_shortages and order.status == OutboundOrderStatus.PLANNED:
             # Just release normally
             return await self.release_order(order_id, tenant_id)

        # Logic to handle shortage:
        # 1. Update status to RELEASED (so tasks can be picked)
        # 2. Optionally: Cancel the remaining lines? Or keep them as Backorder?
        # For now, we keep them as backorder (do nothing to lines).
        
        order.status = OutboundOrderStatus.RELEASED
        order.notes = (order.notes or "") + " | Shortages accepted by user."
        await self.order_repo.update(order)
        
        return order

    async def cancel_order(self, order_id: int, tenant_id: int) -> OutboundOrder:
        order = await self.get_order(order_id, tenant_id)
        if order.status in [OutboundOrderStatus.SHIPPED, OutboundOrderStatus.CANCELLED]:
            raise HTTPException(status_code=400, detail="Cannot cancel finalized order")

        # Logic to de-allocate inventory if reserved
        # (Future implementation: call allocation_service.deallocate_order(order_id))
        
        order.status = OutboundOrderStatus.CANCELLED
        await self.order_repo.update(order)
        return order

    async def create_wave(self, wave_data: OutboundWaveCreate, tenant_id: int, user_id: int) -> OutboundWave:
        """
        Create a new wave with auto-generated wave number if not provided.
        """
        from datetime import datetime

        # Auto-generate wave_number if not provided
        if wave_data.wave_number:
            wave_number = wave_data.wave_number
        else:
            # Generate wave number: WV-YYYYMMDD-XXX
            timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
            wave_number = f"WV-{timestamp}"

        # Create wave
        wave = OutboundWave(
            tenant_id=tenant_id,
            wave_number=wave_number,
            status=OutboundWaveStatus.PLANNING,
            created_by=user_id
        )
        created_wave = await self.wave_repo.create(wave)

        # Link orders to wave
        if wave_data.order_ids:
            for order_id in wave_data.order_ids:
                order = await self.order_repo.get_by_id(order_id, tenant_id)
                if order:
                    order.wave_id = created_wave.id
                    await self.order_repo.update(order)

        return created_wave

    async def list_waves(self, tenant_id: int) -> List[OutboundWave]:
        return await self.wave_repo.list(tenant_id)

    async def complete_pick_task(self, task_id: int, qty_picked: float, user_id: int, tenant_id: int):
        """
        Complete a single pick task.
        """
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # 1. Update Inventory (Physical deduction)
        inventory = await self.inventory_repo.get_by_id(task.inventory_id)
        if not inventory:
             raise HTTPException(status_code=404, detail="Inventory source not found")

        # Decrement quantities
        inventory.quantity -= qty_picked
        inventory.allocated_quantity -= qty_picked
        
        # Safety check (should be enforced by DB constraint, but good to have)
        if inventory.quantity < 0: inventory.quantity = 0
        if inventory.allocated_quantity < 0: inventory.allocated_quantity = 0
        
        await self.inventory_repo.update(inventory)

        # 2. Update Task
        task.qty_picked = qty_picked
        task.status = PickTaskStatus.COMPLETED if qty_picked >= task.qty_to_pick else PickTaskStatus.SHORT
        task.assigned_to_user_id = user_id
        await self.task_repo.update(task)

        # 3. Update Line with database-level atomic update to prevent race conditions
        from sqlalchemy import update
        from decimal import Decimal

        # Use atomic database-level update for qty_picked
        stmt = (
            update(OutboundLine)
            .where(OutboundLine.id == task.line_id)
            .values(qty_picked=OutboundLine.qty_picked + Decimal(str(qty_picked)))
            .execution_options(synchronize_session="fetch")
        )
        await self.db.execute(stmt)
        await self.db.flush()

        # Now fetch the updated line to check status
        line = await self.line_repo.get_by_id(task.line_id)

        # Check if line is fully picked and update status if needed
        if line.qty_picked >= line.qty_ordered and line.line_status != "PICKED":
            line.line_status = "PICKED"
            await self.line_repo.update(line)

        # 4. Check Order Status
        # If all lines are picked, update order status to PICKED
        # (Simple implementation: check this specific line's order)
        # For full correctness, we should query all lines of the order.
        
        # 5. Create Transaction Audit
        transaction = InventoryTransaction(
            tenant_id=tenant_id,
            transaction_type=TransactionType.PICK,
            product_id=line.product_id,
            from_location_id=task.from_location_id,
            to_location_id=task.to_location_id, # Staging/Packing
            inventory_id=inventory.id,
            quantity=-qty_picked, # Negative for removal
            reference_doc=f"TASK-{task.id}",
            performed_by=user_id,
            reference_type="PICK_TASK",
            reference_id=task.id
        )
        await self.transaction_repo.create(transaction)

        return {
            "task_id": task.id,
            "qty_picked": qty_picked,
            "inventory_remaining": inventory.quantity,
            "inventory_allocated": inventory.allocated_quantity,
            "inventory_available": inventory.available_quantity
        }