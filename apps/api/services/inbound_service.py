from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from repositories.inbound_order_repository import InboundOrderRepository
from repositories.inbound_line_repository import InboundLineRepository
from repositories.inbound_shipment_repository import InboundShipmentRepository
from repositories.inventory_transaction_repository import InventoryTransactionRepository
from services.inventory_service import InventoryService
from models.inbound_order import InboundOrder, InboundOrderStatus
from models.inbound_line import InboundLine
from models.inbound_shipment import InboundShipment, InboundShipmentStatus
from schemas.inbound import (
    InboundOrderCreate,
    InboundShipmentCreate,
    ReceiveShipmentInput,
    ReceiveShipmentResponse
)
from schemas.inventory import InventoryReceiveRequest


class InboundService:
    """Service for inbound receiving business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.order_repo = InboundOrderRepository(db)
        self.line_repo = InboundLineRepository(db)
        self.shipment_repo = InboundShipmentRepository(db)
        self.transaction_repo = InventoryTransactionRepository(db)
        self.inventory_service = InventoryService(db)

    async def create_order(
        self,
        order_data: InboundOrderCreate,
        tenant_id: int
    ) -> InboundOrder:
        """
        Create a new inbound order with lines.

        Validates:
        - Order number is unique per tenant
        - All products exist and belong to the tenant
        - Customer exists if order type is CUSTOMER_RETURN

        Args:
            order_data: Order creation data
            tenant_id: ID of the tenant

        Returns:
            Created InboundOrder instance

        Raises:
            HTTPException: If validation fails
        """
        # Check if order number already exists
        existing = await self.order_repo.get_by_order_number(
            order_number=order_data.order_number,
            tenant_id=tenant_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order number '{order_data.order_number}' already exists"
            )

        # Validate customer if specified
        if order_data.customer_id:
            from repositories.depositor_repository import DepositorRepository
            depositor_repo = DepositorRepository(self.db)
            customer = await depositor_repo.get_by_id(
                depositor_id=order_data.customer_id,
                tenant_id=tenant_id
            )
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Customer with ID {order_data.customer_id} not found"
                )

        # Validate all products exist and belong to tenant
        from repositories.product_repository import ProductRepository
        product_repo = ProductRepository(self.db)
        for line in order_data.lines:
            product = await product_repo.get_by_id(
                product_id=line.product_id,
                tenant_id=tenant_id
            )
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {line.product_id} not found"
                )

            # Validate UOM exists
            from repositories.uom_definition_repository import UomDefinitionRepository
            uom_repo = UomDefinitionRepository(self.db)
            uom = await uom_repo.get_by_id(
                uom_id=line.uom_id,
                tenant_id=tenant_id
            )
            if not uom:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"UOM with ID {line.uom_id} not found"
                )

        # Create order
        now = datetime.utcnow()
        order = InboundOrder(
            tenant_id=tenant_id,
            order_number=order_data.order_number,
            order_type=order_data.order_type,
            status=InboundOrderStatus.DRAFT,
            supplier_name=order_data.supplier_name,
            customer_id=order_data.customer_id,
            linked_outbound_order_id=order_data.linked_outbound_order_id,
            expected_delivery_date=order_data.expected_delivery_date,
            notes=order_data.notes,
            created_at=now,
            updated_at=now
        )

        created_order = await self.order_repo.create(order)

        # Create lines
        for line_data in order_data.lines:
            line = InboundLine(
                inbound_order_id=created_order.id,
                product_id=line_data.product_id,
                uom_id=line_data.uom_id,
                expected_quantity=line_data.expected_quantity,
                received_quantity=Decimal('0'),
                expected_batch=line_data.expected_batch,
                notes=line_data.notes,
                created_at=now,
                updated_at=now
            )
            await self.line_repo.create(line)

        # Reload order with lines
        return await self.order_repo.get_by_id(
            order_id=created_order.id,
            tenant_id=tenant_id,
            load_lines=True
        )

    async def get_order(
        self,
        order_id: int,
        tenant_id: int,
        load_lines: bool = True,
        load_shipments: bool = False
    ) -> InboundOrder:
        """
        Get an inbound order by ID with tenant isolation.

        Args:
            order_id: ID of the order
            tenant_id: ID of the tenant
            load_lines: Whether to eager load lines
            load_shipments: Whether to eager load shipments

        Returns:
            InboundOrder instance

        Raises:
            HTTPException: If order not found
        """
        order = await self.order_repo.get_by_id(
            order_id=order_id,
            tenant_id=tenant_id,
            load_lines=load_lines,
            load_shipments=load_shipments
        )

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inbound order with ID {order_id} not found"
            )

        return order

    async def list_orders(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[InboundOrderStatus] = None
    ) -> List[InboundOrder]:
        """List inbound orders with pagination and optional filtering."""
        return await self.order_repo.list_orders(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            status=status,
            load_lines=True
        )

    async def create_shipment(
        self,
        order_id: int,
        shipment_data: InboundShipmentCreate,
        tenant_id: int
    ) -> InboundShipment:
        """
        Create a new shipment (container/truck) for an existing order.

        Args:
            order_id: ID of the inbound order
            shipment_data: Shipment creation data
            tenant_id: ID of the tenant

        Returns:
            Created InboundShipment instance

        Raises:
            HTTPException: If order not found or shipment number exists
        """
        # Validate order exists and belongs to tenant
        order = await self.get_order(order_id, tenant_id, load_lines=False)

        # Check if order is cancelled
        if order.status == InboundOrderStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create shipment for cancelled order"
            )

        # Check if shipment number already exists (globally unique)
        existing_shipment = await self.shipment_repo.get_by_shipment_number(
            shipment_number=shipment_data.shipment_number
        )
        if existing_shipment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Shipment number '{shipment_data.shipment_number}' already exists"
            )

        # Create shipment
        now = datetime.utcnow()
        shipment = InboundShipment(
            inbound_order_id=order_id,
            shipment_number=shipment_data.shipment_number,
            status=InboundShipmentStatus.SCHEDULED,
            driver_details=shipment_data.driver_details,
            arrival_date=shipment_data.arrival_date,
            notes=shipment_data.notes,
            created_at=now,
            updated_at=now
        )

        created_shipment = await self.shipment_repo.create(shipment)

        # Update order status to CONFIRMED if it's DRAFT
        if order.status == InboundOrderStatus.DRAFT:
            order.status = InboundOrderStatus.CONFIRMED
            order.updated_at = now
            await self.order_repo.update(order)

        return created_shipment

    async def receive_shipment_items(
        self,
        receive_data: ReceiveShipmentInput,
        tenant_id: int,
        user_id: int
    ) -> ReceiveShipmentResponse:
        """
        Receive items from a shipment.

        This is the core receiving execution method that:
        1. Validates the shipment exists and belongs to the tenant's order
        2. For each item:
           - Calls InventoryService.receive_stock() to create physical stock
           - Updates the inbound_line.received_quantity
           - Links the transaction to the shipment
        3. Auto-updates order status based on received quantities
        4. Updates shipment status

        Args:
            receive_data: Items being received
            tenant_id: ID of the tenant
            user_id: ID of the user performing the operation

        Returns:
            ReceiveShipmentResponse with summary

        Raises:
            HTTPException: If validation fails or over-receiving
        """
        # Get shipment and validate
        shipment = await self.shipment_repo.get_by_id(receive_data.shipment_id)
        if not shipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shipment with ID {receive_data.shipment_id} not found"
            )

        # Get order and validate tenant
        order = await self.get_order(
            order_id=shipment.inbound_order_id,
            tenant_id=tenant_id,
            load_lines=True
        )

        # Check shipment and order status
        if shipment.status == InboundShipmentStatus.CLOSED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot receive items from a closed shipment"
            )

        if order.status == InboundOrderStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot receive items for a cancelled order"
            )

        # Update shipment status to RECEIVING if it's not already
        if shipment.status in [InboundShipmentStatus.SCHEDULED, InboundShipmentStatus.ARRIVED]:
            shipment.status = InboundShipmentStatus.RECEIVING
            shipment.updated_at = datetime.utcnow()
            await self.shipment_repo.update(shipment)

        # Process each item
        received_count = 0
        for item in receive_data.items:
            # Find the corresponding inbound line
            line = await self.line_repo.get_by_order_and_product(
                order_id=order.id,
                product_id=item.product_id
            )

            if not line:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product {item.product_id} not found in order {order.order_number}"
                )

            # Check for over-receiving
            total_received = line.received_quantity + item.quantity
            if total_received > line.expected_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Over-receiving detected for product {item.product_id}. "
                           f"Expected: {line.expected_quantity}, Already received: {line.received_quantity}, "
                           f"Attempting to receive: {item.quantity}"
                )

            # Get product to determine depositor
            from repositories.product_repository import ProductRepository
            product_repo = ProductRepository(self.db)
            product = await product_repo.get_by_id(
                product_id=item.product_id,
                tenant_id=tenant_id
            )

            # Call InventoryService to create physical stock
            inventory_receive_request = InventoryReceiveRequest(
                depositor_id=product.depositor_id,
                product_id=item.product_id,
                location_id=item.location_id,
                quantity=item.quantity,
                lpn=item.lpn,
                batch_number=item.batch_number,
                expiry_date=item.expiry_date,
                reference_doc=f"INBOUND-{order.order_number}-SHIP-{shipment.shipment_number}"
            )

            inventory = await self.inventory_service.receive_stock(
                receive_data=inventory_receive_request,
                tenant_id=tenant_id,
                user_id=user_id
            )

            # Update the inbound line received quantity
            line.received_quantity += item.quantity
            line.updated_at = datetime.utcnow()
            await self.line_repo.update(line)

            # Link the transaction to the shipment
            # Find the most recent transaction for this inventory
            transaction = await self.transaction_repo.get_latest_for_inventory(inventory.id)
            if transaction:
                transaction.inbound_shipment_id = shipment.id
                await self.transaction_repo.update(transaction)

            received_count += 1

        # Auto-update order status based on received quantities
        await self._update_order_status(order)

        # Close shipment if all lines are fully received
        all_lines_complete = all(
            line.received_quantity >= line.expected_quantity
            for line in order.lines
        )
        if all_lines_complete:
            shipment.status = InboundShipmentStatus.CLOSED
            shipment.closed_date = datetime.utcnow()
            shipment.updated_at = datetime.utcnow()
            await self.shipment_repo.update(shipment)

        # Reload order to get updated status
        updated_order = await self.get_order(order.id, tenant_id, load_lines=True)

        return ReceiveShipmentResponse(
            shipment_id=shipment.id,
            order_id=order.id,
            received_items=received_count,
            message=f"Successfully received {received_count} item(s)",
            order_status=updated_order.status,
            shipment_status=shipment.status
        )

    async def _update_order_status(self, order: InboundOrder) -> None:
        """
        Update order status based on received quantities.

        Logic:
        - All lines fully received -> COMPLETED
        - Some lines partially received -> PARTIALLY_RECEIVED
        - No lines received -> Keep current status
        """
        total_lines = len(order.lines)
        fully_received_lines = sum(
            1 for line in order.lines
            if line.received_quantity >= line.expected_quantity
        )
        partially_received_lines = sum(
            1 for line in order.lines
            if Decimal('0') < line.received_quantity < line.expected_quantity
        )

        if fully_received_lines == total_lines:
            order.status = InboundOrderStatus.COMPLETED
        elif partially_received_lines > 0 or fully_received_lines > 0:
            order.status = InboundOrderStatus.PARTIALLY_RECEIVED

        order.updated_at = datetime.utcnow()
        await self.order_repo.update(order)
