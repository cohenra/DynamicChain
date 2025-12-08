from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from fastapi import HTTPException

from models.allocation_strategy import AllocationStrategy
from models.outbound_order import OutboundOrder, OutboundOrderStatus
from models.outbound_line import OutboundLine
from models.outbound_wave import OutboundWave, OutboundWaveStatus
from models.pick_task import PickTask, PickTaskStatus
from models.inventory import Inventory, InventoryStatus
from models.location import Location
from repositories.allocation_strategy_repository import AllocationStrategyRepository
from repositories.outbound_order_repository import OutboundOrderRepository
from repositories.outbound_wave_repository import OutboundWaveRepository
from repositories.pick_task_repository import PickTaskRepository


class AllocationService:
    """
    Core allocation logic for the Outbound module.
    Implements multi-warehouse allocation with FEFO/LIFO/BEST_FIT strategies.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.strategy_repo = AllocationStrategyRepository(db)
        self.order_repo = OutboundOrderRepository(db)
        self.wave_repo = OutboundWaveRepository(db)
        self.task_repo = PickTaskRepository(db)

    async def allocate_order(
        self,
        order_id: int,
        tenant_id: int,
        strategy_id: Optional[int] = None
    ) -> OutboundOrder:
        """
        Allocate inventory for a single order.
        Creates PickTask records and updates order status to PLANNED.
        """
        # 1. Fetch order with lines
        order = await self.order_repo.get_by_id(order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

        if order.status not in [OutboundOrderStatus.DRAFT, OutboundOrderStatus.VERIFIED]:
            raise HTTPException(
                status_code=400,
                detail=f"Order {order.order_number} cannot be allocated (status: {order.status})"
            )

        # 2. Get allocation strategy
        strategy = await self._get_strategy(strategy_id, tenant_id)

        # 3. Begin transaction
        async with self.db.begin_nested():
            try:
                # 4. Allocate each line
                total_tasks = 0
                for line in order.lines:
                    tasks_created = await self._allocate_line(
                        line=line,
                        order=order,
                        strategy=strategy,
                        tenant_id=tenant_id
                    )
                    total_tasks += tasks_created

                # 5. Update order status
                order.status = OutboundOrderStatus.PLANNED
                order.status_changed_at = datetime.utcnow()
                order.metrics = {
                    **order.metrics,
                    "tasks_created": total_tasks,
                    "allocated_at": datetime.utcnow().isoformat()
                }
                await self.db.flush()

                await self.db.commit()

                print(f"✅ Allocated order {order.order_number} with {total_tasks} pick tasks")
                return await self.order_repo.get_by_id(order_id, tenant_id)

            except Exception as e:
                await self.db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Allocation failed: {str(e)}"
                )

    async def allocate_wave(
        self,
        wave_id: int,
        tenant_id: int
    ) -> OutboundWave:
        """
        Allocate inventory for all orders in a wave.
        Uses the wave's strategy for allocation.
        """
        # 1. Fetch wave with orders
        wave = await self.wave_repo.get_by_id(wave_id, tenant_id)
        if not wave:
            raise HTTPException(status_code=404, detail=f"Wave {wave_id} not found")

        if wave.status != OutboundWaveStatus.PLANNING:
            raise HTTPException(
                status_code=400,
                detail=f"Wave {wave.wave_number} cannot be allocated (status: {wave.status})"
            )

        # 2. Get strategy
        strategy = await self._get_strategy(wave.strategy_id, tenant_id)

        # 3. Begin transaction
        async with self.db.begin_nested():
            try:
                total_tasks = 0

                # 4. Allocate each order in the wave
                for order in wave.orders:
                    for line in order.lines:
                        tasks_created = await self._allocate_line(
                            line=line,
                            order=order,
                            strategy=strategy,
                            tenant_id=tenant_id,
                            wave_id=wave_id
                        )
                        total_tasks += tasks_created

                    # Update order status
                    order.status = OutboundOrderStatus.PLANNED
                    order.status_changed_at = datetime.utcnow()

                # 5. Update wave status
                wave.status = OutboundWaveStatus.ALLOCATED
                await self.db.flush()

                await self.db.commit()

                print(f"✅ Allocated wave {wave.wave_number} with {total_tasks} pick tasks")
                return await self.wave_repo.get_by_id(wave_id, tenant_id)

            except Exception as e:
                await self.db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Wave allocation failed: {str(e)}"
                )

    async def _allocate_line(
        self,
        line: OutboundLine,
        order: OutboundOrder,
        strategy: AllocationStrategy,
        tenant_id: int,
        wave_id: Optional[int] = None
    ) -> int:
        """
        Allocate inventory for a single order line.
        Returns the number of pick tasks created.
        """
        rules = strategy.rules_config
        qty_needed = line.qty_ordered - line.qty_allocated

        if qty_needed <= 0:
            return 0

        # 1. Warehouse selection
        warehouses = await self._select_warehouses(
            product_id=line.product_id,
            customer_id=order.customer_id,
            qty_needed=qty_needed,
            warehouse_logic=rules.get("warehouse_logic", {}),
            tenant_id=tenant_id
        )

        # 2. Search inventory in selected warehouses
        total_allocated = Decimal('0')
        tasks_created = 0

        for warehouse_id in warehouses:
            if total_allocated >= qty_needed:
                break

            remaining = qty_needed - total_allocated

            # Find inventory
            inventory_items = await self._find_inventory(
                product_id=line.product_id,
                warehouse_id=warehouse_id,
                tenant_id=tenant_id,
                rules=rules,
                qty_needed=remaining
            )

            # Create pick tasks
            for inv_item in inventory_items:
                if total_allocated >= qty_needed:
                    break

                # Calculate available quantity for this inventory item
                available = inv_item.quantity - inv_item.allocated_quantity
                qty_to_pick = min(available, remaining)

                if qty_to_pick <= 0:
                    continue

                # Create pick task
                task = PickTask(
                    wave_id=wave_id,
                    order_id=order.id,
                    line_id=line.id,
                    inventory_id=inv_item.id,
                    from_location_id=inv_item.location_id,
                    qty_to_pick=qty_to_pick,
                    status=PickTaskStatus.PENDING
                )
                self.db.add(task)

                # Update allocated_quantity (NO status change, NO splitting)
                inv_item.allocated_quantity += qty_to_pick

                # Create audit transaction for allocation
                from models.inventory_transaction import InventoryTransaction
                transaction = InventoryTransaction(
                    inventory_id=inv_item.id,
                    transaction_type="ALLOCATION",
                    quantity_change=-qty_to_pick,  # Negative because we're reserving
                    quantity_after=inv_item.quantity,  # Physical quantity unchanged
                    location_id=inv_item.location_id,
                    reference_type="OUTBOUND_ORDER",
                    reference_id=order.id,
                    notes=f"Allocated {qty_to_pick} for order {order.order_number}, line {line.id}"
                )
                self.db.add(transaction)

                total_allocated += qty_to_pick
                remaining = qty_needed - total_allocated
                tasks_created += 1

        # 3. Update line quantities
        line.qty_allocated = total_allocated

        # 4. Set line status based on allocation result
        if total_allocated == 0:
            line.line_status = "SHORT"  # No inventory found
        elif total_allocated < qty_needed:
            line.line_status = "PARTIAL"  # Some allocated but not all
        else:
            line.line_status = "ALLOCATED"  # Fully allocated

        # 5. Handle partial allocation
        partial_policy = rules.get("partial_policy", "ALLOW_PARTIAL")
        if total_allocated < qty_needed:
            if partial_policy == "FILL_OR_KILL":
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot fully allocate line {line.id} (needed: {qty_needed}, found: {total_allocated})"
                )
            else:
                print(f"⚠️ Partial allocation for line {line.id}: {total_allocated}/{qty_needed} (status: {line.line_status})")

        return tasks_created

    async def _select_warehouses(
        self,
        product_id: int,
        customer_id: int,
        qty_needed: Decimal,
        warehouse_logic: Dict,
        tenant_id: int
    ) -> List[int]:
        """
        Select warehouses based on the strategy's warehouse_logic.

        Modes:
        - PRIORITY: Use warehouses in priority order
        - OPTIMAL: Find warehouse with most inventory
        """
        mode = warehouse_logic.get("mode", "PRIORITY")
        priority_warehouses = warehouse_logic.get("priority_warehouses", [])
        max_splits = warehouse_logic.get("max_splits", 2)

        if mode == "OPTIMAL":
            # Find warehouse with most AVAILABLE inventory for this product
            from sqlalchemy import func

            stmt = (
                select(
                    Location.warehouse_id,
                    func.sum(Inventory.quantity - Inventory.allocated_quantity).label('available_qty')
                )
                .join(Inventory, Inventory.location_id == Location.id)
                .where(
                    and_(
                        Inventory.product_id == product_id,
                        Inventory.tenant_id == tenant_id,
                        Inventory.quantity > Inventory.allocated_quantity,  # Has available quantity
                        Location.warehouse_id.in_(priority_warehouses)
                    )
                )
                .group_by(Location.warehouse_id)
                .order_by(func.sum(Inventory.quantity - Inventory.allocated_quantity).desc())
                .limit(max_splits)
            )
            result = await self.db.execute(stmt)
            return [row[0] for row in result.all()]

        else:  # PRIORITY mode
            return priority_warehouses[:max_splits]

    async def _find_inventory(
        self,
        product_id: int,
        warehouse_id: int,
        tenant_id: int,
        rules: Dict,
        qty_needed: Decimal
    ) -> List[Inventory]:
        """
        Find available inventory for allocation with row-level locking.
        Applies sorting based on picking_policy (FEFO/LIFO/BEST_FIT).
        Uses allocated_quantity to track reservations without status changes.
        """
        # Build base query with FOR UPDATE lock for concurrency control
        stmt = (
            select(Inventory)
            .join(Location, Inventory.location_id == Location.id)
            .where(
                and_(
                    Inventory.product_id == product_id,
                    Inventory.tenant_id == tenant_id,
                    Location.warehouse_id == warehouse_id,
                    # Only consider inventory with available quantity
                    Inventory.quantity > Inventory.allocated_quantity
                )
            )
            .with_for_update()  # Row-level locking for concurrency
        )

        # Apply sorting based on policy
        picking_policy = rules.get("picking_policy", "FEFO")

        if picking_policy == "FEFO":
            # First Expired First Out
            stmt = stmt.order_by(
                Inventory.expiry_date.asc().nullslast(),
                Inventory.fifo_date.asc()
            )
        elif picking_policy == "LIFO":
            # Last In First Out
            stmt = stmt.order_by(Inventory.fifo_date.desc())
        elif picking_policy == "BEST_FIT":
            # Find inventory closest to qty_needed (minimize waste)
            # For now, prioritize larger quantities
            stmt = stmt.order_by(Inventory.quantity.desc())

        # Apply pallet logic
        pallet_logic = rules.get("pallet_logic", "PRIORITIZE_LOOSE")
        if pallet_logic == "PRIORITIZE_FULL_PALLET":
            # Prioritize larger quantities (full pallets)
            stmt = stmt.order_by(Inventory.quantity.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _get_strategy(
        self,
        strategy_id: Optional[int],
        tenant_id: int
    ) -> AllocationStrategy:
        """Get allocation strategy by ID or use default."""
        if strategy_id:
            strategy = await self.strategy_repo.get_by_id(strategy_id, tenant_id)
            if not strategy:
                raise HTTPException(
                    status_code=404,
                    detail=f"Strategy {strategy_id} not found"
                )
            return strategy
        else:
            # Get default strategy (first active one)
            strategies = await self.strategy_repo.list_strategies(
                tenant_id=tenant_id,
                active_only=True,
                limit=1
            )
            if not strategies:
                raise HTTPException(
                    status_code=400,
                    detail="No active allocation strategy found"
                )
            return strategies[0]
