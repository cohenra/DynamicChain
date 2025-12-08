from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from models.outbound_order import OutboundOrder, OutboundOrderStatus
from models.outbound_line import OutboundLine
from models.outbound_wave import OutboundWave, OutboundWaveStatus
from models.product import Product
from repositories.outbound_order_repository import OutboundOrderRepository
from repositories.outbound_wave_repository import OutboundWaveRepository
from repositories.outbound_line_repository import OutboundLineRepository
from repositories.product_repository import ProductRepository
from services.allocation_service import AllocationService


class OutboundService:
    """Business logic for outbound operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.order_repo = OutboundOrderRepository(db)
        self.wave_repo = OutboundWaveRepository(db)
        self.line_repo = OutboundLineRepository(db)
        self.product_repo = ProductRepository(db)
        self.allocation_service = AllocationService(db)

    # ============================================================
    # Orders
    # ============================================================

    async def list_orders(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OutboundOrderStatus] = None,
        customer_id: Optional[int] = None,
        order_type: Optional[str] = None
    ) -> List[OutboundOrder]:
        """List outbound orders with filtering."""
        return await self.order_repo.list_orders(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            status=status,
            customer_id=customer_id,
            order_type=order_type
        )

    async def get_order(
        self,
        order_id: int,
        tenant_id: int
    ) -> OutboundOrder:
        """Get order by ID."""
        order = await self.order_repo.get_by_id(order_id, tenant_id)
        if not order:
            raise HTTPException(
                status_code=404,
                detail=f"Outbound order {order_id} not found"
            )
        return order

    async def create_order(
        self,
        order_number: str,
        customer_id: int,
        order_type: str,
        lines: List[dict],
        tenant_id: int,
        priority: int = 5,
        requested_delivery_date: Optional[str] = None,
        shipping_details: Optional[dict] = None,
        notes: Optional[str] = None,
        created_by: Optional[int] = None
    ) -> OutboundOrder:
        """
        Create a new outbound order.

        Validates that all products exist before creating the order.
        """
        # 1. Validate products exist
        for line_data in lines:
            product = await self.product_repo.get_by_id(line_data["product_id"])
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product {line_data['product_id']} not found"
                )

        # 2. Create order header
        order = OutboundOrder(
            tenant_id=tenant_id,
            order_number=order_number,
            customer_id=customer_id,
            order_type=order_type,
            priority=priority,
            status=OutboundOrderStatus.DRAFT,
            requested_delivery_date=requested_delivery_date,
            shipping_details=shipping_details or {},
            notes=notes,
            created_by=created_by,
            metrics={
                "total_lines": len(lines),
                "total_units": sum(line["qty_ordered"] for line in lines),
                "progress_percent": 0
            }
        )
        self.db.add(order)
        await self.db.flush()

        # 3. Create order lines
        for line_data in lines:
            line = OutboundLine(
                order_id=order.id,
                product_id=line_data["product_id"],
                uom_id=line_data["uom_id"],
                qty_ordered=line_data["qty_ordered"],
                constraints=line_data.get("constraints", {}),
                notes=line_data.get("notes")
            )
            self.db.add(line)

        await self.db.commit()
        return await self.get_order(order.id, tenant_id)

    async def allocate_order(
        self,
        order_id: int,
        tenant_id: int,
        strategy_id: Optional[int] = None
    ) -> OutboundOrder:
        """
        Allocate inventory for an order.
        Delegates to AllocationService.
        """
        return await self.allocation_service.allocate_order(
            order_id=order_id,
            tenant_id=tenant_id,
            strategy_id=strategy_id
        )

    async def release_order(
        self,
        order_id: int,
        tenant_id: int
    ) -> OutboundOrder:
        """
        Release an order (change status to RELEASED).
        Order must be in PLANNED status.
        """
        order = await self.get_order(order_id, tenant_id)

        if order.status != OutboundOrderStatus.PLANNED:
            raise HTTPException(
                status_code=400,
                detail=f"Order {order.order_number} must be PLANNED before release (current: {order.status})"
            )

        order.status = OutboundOrderStatus.RELEASED
        order.status_changed_at = datetime.utcnow()
        await self.db.commit()

        return await self.get_order(order_id, tenant_id)

    async def cancel_order(
        self,
        order_id: int,
        tenant_id: int
    ) -> OutboundOrder:
        """Cancel an order."""
        order = await self.get_order(order_id, tenant_id)

        if order.status in [OutboundOrderStatus.SHIPPED, OutboundOrderStatus.CANCELLED]:
            raise HTTPException(
                status_code=400,
                detail=f"Order {order.order_number} cannot be cancelled (status: {order.status})"
            )

        order.status = OutboundOrderStatus.CANCELLED
        order.status_changed_at = datetime.utcnow()
        await self.db.commit()

        return await self.get_order(order_id, tenant_id)

    # ============================================================
    # Waves
    # ============================================================

    async def list_waves(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OutboundWaveStatus] = None
    ) -> List[OutboundWave]:
        """List outbound waves."""
        return await self.wave_repo.list_waves(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            status=status
        )

    async def get_wave(
        self,
        wave_id: int,
        tenant_id: int
    ) -> OutboundWave:
        """Get wave by ID."""
        wave = await self.wave_repo.get_by_id(wave_id, tenant_id)
        if not wave:
            raise HTTPException(
                status_code=404,
                detail=f"Outbound wave {wave_id} not found"
            )
        return wave

    async def create_wave(
        self,
        wave_number: str,
        tenant_id: int,
        strategy_id: Optional[int] = None,
        order_ids: Optional[List[int]] = None,
        created_by: Optional[int] = None
    ) -> OutboundWave:
        """Create a new wave."""
        wave = OutboundWave(
            tenant_id=tenant_id,
            wave_number=wave_number,
            strategy_id=strategy_id,
            status=OutboundWaveStatus.PLANNING,
            created_by=created_by
        )
        self.db.add(wave)
        await self.db.flush()

        # Add orders to wave if provided
        if order_ids:
            for order_id in order_ids:
                order = await self.get_order(order_id, tenant_id)
                if order.status not in [OutboundOrderStatus.DRAFT, OutboundOrderStatus.VERIFIED]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Order {order.order_number} cannot be added to wave (status: {order.status})"
                    )
                order.wave_id = wave.id

        await self.db.commit()
        return await self.get_wave(wave.id, tenant_id)

    async def add_orders_to_wave(
        self,
        wave_id: int,
        order_ids: List[int],
        tenant_id: int
    ) -> OutboundWave:
        """Add orders to an existing wave."""
        wave = await self.get_wave(wave_id, tenant_id)

        if wave.status != OutboundWaveStatus.PLANNING:
            raise HTTPException(
                status_code=400,
                detail=f"Wave {wave.wave_number} is not in PLANNING status"
            )

        for order_id in order_ids:
            order = await self.get_order(order_id, tenant_id)
            if order.status not in [OutboundOrderStatus.DRAFT, OutboundOrderStatus.VERIFIED]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Order {order.order_number} cannot be added to wave"
                )
            order.wave_id = wave.id

        await self.db.commit()
        return await self.get_wave(wave_id, tenant_id)

    async def allocate_wave(
        self,
        wave_id: int,
        tenant_id: int
    ) -> OutboundWave:
        """
        Allocate inventory for all orders in a wave.
        Delegates to AllocationService.
        """
        return await self.allocation_service.allocate_wave(
            wave_id=wave_id,
            tenant_id=tenant_id
        )

    async def release_wave(
        self,
        wave_id: int,
        tenant_id: int
    ) -> OutboundWave:
        """Release a wave (change status to RELEASED)."""
        wave = await self.get_wave(wave_id, tenant_id)

        if wave.status != OutboundWaveStatus.ALLOCATED:
            raise HTTPException(
                status_code=400,
                detail=f"Wave {wave.wave_number} must be ALLOCATED before release"
            )

        wave.status = OutboundWaveStatus.RELEASED
        await self.db.commit()

        return await self.get_wave(wave_id, tenant_id)
