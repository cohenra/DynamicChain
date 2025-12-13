from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from models.outbound_order import OutboundOrder, OutboundOrderStatus
from models.outbound_line import OutboundLine
from models.outbound_wave import OutboundWave, OutboundWaveStatus
from models.pick_task import PickTask, PickTaskStatus
from models.inventory_transaction import InventoryTransaction, TransactionType
from models.allocation_strategy import WaveType
from repositories.outbound_order_repository import OutboundOrderRepository
from repositories.outbound_line_repository import OutboundLineRepository
from repositories.outbound_wave_repository import OutboundWaveRepository
from repositories.pick_task_repository import PickTaskRepository
from repositories.product_repository import ProductRepository
from repositories.inventory_repository import InventoryRepository
from repositories.inventory_transaction_repository import InventoryTransactionRepository
from repositories.allocation_strategy_repository import AllocationStrategyRepository
from services.allocation_service import AllocationService
from schemas.outbound import (
    OutboundOrderCreate,
    OutboundWaveCreate,
    WaveSimulationCriteria,
    WaveSimulationResponse,
    OrderSimulationSummary,
    CreateWaveWithCriteriaRequest
)

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
        self.strategy_repo = AllocationStrategyRepository(db)
        self.allocation_service = AllocationService(db)

    async def create_order(self, order_data: OutboundOrderCreate, tenant_id: int, user_id: int) -> OutboundOrder:
        # Validate products exist
        for line in order_data.lines:
            product = await self.product_repo.get_by_id(line.product_id, tenant_id)
            if not product:
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
        # Validate order exists and has correct status
        order = await self.get_order(order_id, tenant_id)
        if order.status not in [OutboundOrderStatus.DRAFT, OutboundOrderStatus.VERIFIED, OutboundOrderStatus.PLANNED]:
             raise HTTPException(status_code=400, detail=f"Cannot allocate order in status {order.status}")

        # Delegate to Allocation Service
        # FIX: Corrected argument order (tenant_id, strategy_id)
        await self.allocation_service.allocate_order(
            order_id=order_id, 
            tenant_id=tenant_id, 
            strategy_id=strategy_id
        )
        
        # Return updated order
        return await self.get_order(order_id, tenant_id)

    async def release_order(self, order_id: int, tenant_id: int) -> OutboundOrder:
        """
        Release order to picking
        """
        order = await self.get_order(order_id, tenant_id)
        
        if order.status != OutboundOrderStatus.PLANNED:
            raise HTTPException(status_code=400, detail="Order must be PLANNED to release")

        # Update status to RELEASED
        order.status = OutboundOrderStatus.RELEASED
        await self.order_repo.update(order)
        
        return order

    async def accept_shortages(self, order_id: int, tenant_id: int) -> OutboundOrder:
        """
        Accept that the order is partially allocated and release it.
        """
        order = await self.get_order(order_id, tenant_id)
        
        # Check if there are unallocated quantities
        has_shortages = any(line.qty_allocated < line.qty_ordered for line in order.lines)
        
        if not has_shortages and order.status == OutboundOrderStatus.PLANNED:
             # Just release normally if no shortages
             return await self.release_order(order_id, tenant_id)

        # Update status to RELEASED
        order.status = OutboundOrderStatus.RELEASED
        order.notes = (order.notes or "") + " | Shortages accepted by user."
        await self.order_repo.update(order)
        
        return order

    async def cancel_order(self, order_id: int, tenant_id: int) -> OutboundOrder:
        order = await self.get_order(order_id, tenant_id)
        if order.status in [OutboundOrderStatus.SHIPPED, OutboundOrderStatus.CANCELLED]:
            raise HTTPException(status_code=400, detail="Cannot cancel finalized order")

        # Logic to de-allocate inventory if reserved would go here
        
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
            created_by=user_id,
            strategy_id=wave_data.strategy_id
        )
        created_wave = await self.wave_repo.create(wave)

        # Link orders to wave
        if wave_data.order_ids:
            for order_id in wave_data.order_ids:
                order = await self.order_repo.get_by_id(order_id, tenant_id)
                if order:
                    order.wave_id = created_wave.id
                    await self.order_repo.update(order)

        # FIX: Fetch the wave again to ensure relationships (like orders) are loaded for the response model
        return await self.wave_repo.get_by_id(created_wave.id, tenant_id)

    async def list_waves(
        self, 
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[OutboundWave]:
        # FIX: Added arguments to match router call and use repo's list_waves method
        return await self.wave_repo.list_waves(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            status=status
        )

    async def get_wave(self, wave_id: int, tenant_id: int) -> OutboundWave:
        wave = await self.wave_repo.get_by_id(wave_id, tenant_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Wave not found")
        return wave

    async def add_orders_to_wave(self, wave_id: int, order_ids: List[int], tenant_id: int) -> OutboundWave:
        wave = await self.get_wave(wave_id, tenant_id)
        
        if wave.status != OutboundWaveStatus.PLANNING:
            raise HTTPException(status_code=400, detail="Cannot add orders to wave that is not in PLANNING")

        for order_id in order_ids:
            order = await self.order_repo.get_by_id(order_id, tenant_id)
            if order:
                order.wave_id = wave.id
                await self.order_repo.update(order)
        
        return await self.get_wave(wave_id, tenant_id)

    async def allocate_wave(self, wave_id: int, tenant_id: int) -> OutboundWave:
        return await self.allocation_service.allocate_wave(wave_id, tenant_id)

    async def release_wave(self, wave_id: int, tenant_id: int) -> OutboundWave:
        wave = await self.get_wave(wave_id, tenant_id)
        
        if wave.status != OutboundWaveStatus.ALLOCATED:
            raise HTTPException(status_code=400, detail="Wave must be ALLOCATED to release")

        # Update wave status
        wave.status = OutboundWaveStatus.RELEASED
        await self.wave_repo.update(wave)
        
        # Also release all orders in wave
        for order in wave.orders:
            if order.status == OutboundOrderStatus.PLANNED:
                order.status = OutboundOrderStatus.RELEASED
                await self.order_repo.update(order)

        return wave

    async def complete_pick_task(self, task_id: int, qty_picked: float, user_id: int, tenant_id: int):
        """
        Complete a single pick task.
        """
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # 1. Update Inventory (Physical deduction)
        inventory = await self.inventory_repo.get_by_id(task.inventory_id, tenant_id)
        if not inventory:
             raise HTTPException(status_code=404, detail="Inventory source not found")

        # Decrement quantities
        inventory.quantity -= Decimal(str(qty_picked))
        inventory.allocated_quantity -= Decimal(str(qty_picked))
        
        # Safety check
        if inventory.quantity < 0: inventory.quantity = 0
        if inventory.allocated_quantity < 0: inventory.allocated_quantity = 0
        
        await self.inventory_repo.update(inventory)

        # 2. Update Task
        task.qty_picked = Decimal(str(qty_picked))
        task.status = PickTaskStatus.COMPLETED if task.qty_picked >= task.qty_to_pick else PickTaskStatus.SHORT
        task.assigned_to_user_id = user_id
        task.completed_at = datetime.utcnow() # Add completion timestamp
        await self.task_repo.update(task)

        # 3. Update Line with database-level atomic update to prevent race conditions
        from sqlalchemy import update
        from decimal import Decimal
        from datetime import datetime

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
        line = await self.line_repo.get_by_id(task.line_id) # line_repo doesn't use tenant_id

        # Check if line is fully picked and update status if needed
        if line.qty_picked >= line.qty_ordered and line.line_status != "PICKED":
            line.line_status = "PICKED"
            await self.line_repo.update(line)

        # 5. Create Transaction Audit
        transaction = InventoryTransaction(
            tenant_id=tenant_id,
            transaction_type=TransactionType.PICK,
            product_id=line.product_id,
            from_location_id=task.from_location_id,
            to_location_id=task.to_location_id, # Staging/Packing
            inventory_id=inventory.id,
            quantity=Decimal(str(qty_picked)), # Positive quantity for record (context implies removal)
            reference_doc=f"TASK-{task.id}",
            performed_by=user_id,
            timestamp=datetime.utcnow(),
            billing_metadata={"operation": "pick", "task_id": task.id}
        )
        # Note: Transaction quantity logic in inventory_service usually expects positive for add, logic might need verify
        # but here we log the action. If report sums it up, verify sign convention.
        
        await self.transaction_repo.create(transaction)

        return {
            "task_id": task.id,
            "qty_picked": qty_picked,
            "inventory_remaining": inventory.quantity,
            "inventory_allocated": inventory.allocated_quantity,
            "inventory_available": inventory.available_quantity
        }

    # ============================================================================
    # Wave Wizard Methods
    # ============================================================================

    async def simulate_wave(
        self,
        wave_type: WaveType,
        criteria: WaveSimulationCriteria,
        tenant_id: int
    ) -> WaveSimulationResponse:
        """
        Simulate wave creation to preview matched orders and resolved strategy.
        """
        # 1. Resolve strategy from wave_type
        strategy = await self.strategy_repo.get_by_wave_type(wave_type, tenant_id)
        if not strategy:
            raise HTTPException(
                status_code=400,
                detail=f"No active strategy configured for wave type: {wave_type.value}"
            )

        # 2. Query orders matching criteria (DRAFT or VERIFIED status, not in a wave)
        from sqlalchemy import select, and_
        from sqlalchemy.orm import selectinload

        stmt = select(OutboundOrder).where(
            OutboundOrder.tenant_id == tenant_id,
            OutboundOrder.status.in_([OutboundOrderStatus.DRAFT, OutboundOrderStatus.VERIFIED]),
            OutboundOrder.wave_id.is_(None)  # Not already in a wave
        ).options(
            selectinload(OutboundOrder.lines),
            selectinload(OutboundOrder.customer)
        )

        # Apply criteria filters
        if criteria.delivery_date_from:
            stmt = stmt.where(OutboundOrder.requested_delivery_date >= criteria.delivery_date_from)
        if criteria.delivery_date_to:
            stmt = stmt.where(OutboundOrder.requested_delivery_date <= criteria.delivery_date_to)
        if criteria.customer_id:
            stmt = stmt.where(OutboundOrder.customer_id == criteria.customer_id)
        if criteria.order_type:
            stmt = stmt.where(OutboundOrder.order_type == criteria.order_type)
        if criteria.priority:
            stmt = stmt.where(OutboundOrder.priority <= criteria.priority)

        # Order by priority (urgent first)
        stmt = stmt.order_by(OutboundOrder.priority.asc(), OutboundOrder.created_at.asc())

        result = await self.db.execute(stmt)
        orders = list(result.scalars().all())

        # 3. Build response
        order_summaries = []
        total_lines = 0
        total_qty = Decimal("0")

        for order in orders:
            lines_count = len(order.lines) if order.lines else 0
            order_total_qty = sum(Decimal(str(line.qty_ordered)) for line in order.lines) if order.lines else Decimal("0")

            order_summaries.append(OrderSimulationSummary(
                id=order.id,
                order_number=order.order_number,
                customer_name=order.customer.name if order.customer else "Unknown",
                order_type=order.order_type,
                priority=order.priority,
                requested_delivery_date=order.requested_delivery_date,
                lines_count=lines_count,
                total_qty=order_total_qty
            ))

            total_lines += lines_count
            total_qty += order_total_qty

        return WaveSimulationResponse(
            matched_orders_count=len(orders),
            total_lines=total_lines,
            total_qty=total_qty,
            orders=order_summaries,
            resolved_strategy_id=strategy.id,
            resolved_strategy_name=strategy.name,
            wave_type=wave_type
        )

    async def get_available_wave_types(self, tenant_id: int):
        """Get all wave types with configured strategies."""
        return await self.strategy_repo.list_available_wave_types(tenant_id)

    async def create_wave_with_criteria(
        self,
        request: CreateWaveWithCriteriaRequest,
        tenant_id: int,
        user_id: int
    ) -> OutboundWave:
        """
        Create a wave with auto-strategy mapping based on wave type.
        Stores the criteria used for audit purposes.
        """
        # 1. Resolve strategy from wave_type
        strategy = await self.strategy_repo.get_by_wave_type(request.wave_type, tenant_id)
        if not strategy:
            raise HTTPException(
                status_code=400,
                detail=f"No active strategy configured for wave type: {request.wave_type.value}"
            )

        # 2. Generate wave name if not provided
        if request.wave_name:
            wave_number = request.wave_name
        else:
            timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
            wave_type_short = request.wave_type.value[:4].upper()
            wave_number = f"WV-{wave_type_short}-{timestamp}"

        # 3. Create wave with strategy and metadata
        wave = OutboundWave(
            tenant_id=tenant_id,
            wave_number=wave_number,
            status=OutboundWaveStatus.PLANNING,
            strategy_id=strategy.id,
            created_by=user_id,
            # Store criteria in metrics for audit
            metrics={
                "wave_type": request.wave_type.value,
                "criteria": {
                    "delivery_date_from": str(request.criteria.delivery_date_from) if request.criteria.delivery_date_from else None,
                    "delivery_date_to": str(request.criteria.delivery_date_to) if request.criteria.delivery_date_to else None,
                    "customer_id": request.criteria.customer_id,
                    "order_type": request.criteria.order_type,
                    "priority": request.criteria.priority
                },
                "created_with_wizard": True
            }
        )
        created_wave = await self.wave_repo.create(wave)

        # 4. Link orders to wave
        if request.order_ids:
            for order_id in request.order_ids:
                order = await self.order_repo.get_by_id(order_id, tenant_id)
                if order and order.wave_id is None:  # Only if not already in a wave
                    order.wave_id = created_wave.id
                    await self.order_repo.update(order)

        # 5. Fetch and return the wave with relationships
        return await self.wave_repo.get_by_id(created_wave.id, tenant_id)