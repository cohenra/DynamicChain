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
        user_id: int
    ) -> Inventory:
        """
        Receive new stock into the warehouse.

        This method:
        1. Validates product and location exist
        2. Validates depositor exists and belongs to tenant
        3. Generates unique LPN if not provided
        4. Creates inventory record with FIFO date set to now
        5. Creates INBOUND_RECEIVE transaction for billing

        Args:
            receive_data: Stock receiving data
            tenant_id: ID of the tenant
            user_id: ID of the user performing the operation

        Returns:
            Created Inventory instance

        Raises:
            HTTPException: If validation fails or duplicate LPN
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

        # Validate depositor exists and belongs to tenant
        from repositories.depositor_repository import DepositorRepository
        depositor_repo = DepositorRepository(self.db)
        depositor = await depositor_repo.get_by_id(
            depositor_id=receive_data.depositor_id,
            tenant_id=tenant_id
        )
        if not depositor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Depositor with ID {receive_data.depositor_id} not found"
            )

        # Validate location exists and belongs to tenant
        from repositories.location_repository import LocationRepository
        location_repo = LocationRepository(self.db)
        location = await location_repo.get_by_id(
            location_id=receive_data.location_id,
            tenant_id=tenant_id
        )
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location with ID {receive_data.location_id} not found"
            )

        # Generate LPN if not provided
        lpn = receive_data.lpn
        if not lpn:
            lpn = self._generate_lpn()
        else:
            # Check if LPN already exists for this tenant
            existing_inventory = await self.inventory_repo.get_by_lpn(
                lpn=lpn,
                tenant_id=tenant_id
            )
            if existing_inventory:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"LPN '{lpn}' already exists for this tenant"
                )

        # Create inventory record
        now = datetime.utcnow()
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
            fifo_date=now,  # CRITICAL: Set FIFO date to now for billing
            created_at=now,
            updated_at=now
        )

        created_inventory = await self.inventory_repo.create(inventory)

        # Create transaction record for audit trail and billing
        transaction = InventoryTransaction(
            tenant_id=tenant_id,
            transaction_type=TransactionType.INBOUND_RECEIVE,
            product_id=receive_data.product_id,
            from_location_id=None,  # No source location for receiving
            to_location_id=receive_data.location_id,
            inventory_id=created_inventory.id,
            quantity=receive_data.quantity,
            reference_doc=receive_data.reference_doc,
            performed_by=user_id,
            timestamp=now,
            billing_metadata={
                "operation": "receive",
                "lpn": lpn,
                "batch_number": receive_data.batch_number,
                "expiry_date": receive_data.expiry_date.isoformat() if receive_data.expiry_date else None
            }
        )

        await self.transaction_repo.create(transaction)

        return created_inventory

    async def get_inventory(
        self,
        inventory_id: int,
        tenant_id: int
    ) -> Inventory:
        """
        Get inventory by ID with tenant isolation.

        Args:
            inventory_id: ID of the inventory
            tenant_id: ID of the tenant

        Returns:
            Inventory instance

        Raises:
            HTTPException: If inventory not found
        """
        inventory = await self.inventory_repo.get_by_id(
            inventory_id=inventory_id,
            tenant_id=tenant_id
        )

        if not inventory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory with ID {inventory_id} not found"
            )

        return inventory

    async def get_inventory_by_lpn(
        self,
        lpn: str,
        tenant_id: int
    ) -> Inventory:
        """
        Get inventory by LPN with tenant isolation.

        Args:
            lpn: License Plate Number
            tenant_id: ID of the tenant

        Returns:
            Inventory instance

        Raises:
            HTTPException: If inventory not found
        """
        inventory = await self.inventory_repo.get_by_lpn(
            lpn=lpn,
            tenant_id=tenant_id
        )

        if not inventory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory with LPN '{lpn}' not found"
            )

        return inventory

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
        """
        List inventory with pagination and optional filters.

        Args:
            tenant_id: ID of the tenant
            skip: Number of records to skip
            limit: Maximum number of records to return
            product_id: Optional product ID filter
            location_id: Optional location ID filter
            depositor_id: Optional depositor ID filter
            status: Optional status filter
            lpn: Optional LPN partial match filter

        Returns:
            List of Inventory instances
        """
        return await self.inventory_repo.list_inventory(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            product_id=product_id,
            location_id=location_id,
            depositor_id=depositor_id,
            status=status,
            lpn=lpn
        )

    async def move_stock(
        self,
        move_data: InventoryMoveRequest,
        tenant_id: int,
        user_id: int
    ) -> Inventory:
        """
        Move inventory from one location to another.

        Uses row-level locking to prevent race conditions.

        Args:
            move_data: Move request data
            tenant_id: ID of the tenant
            user_id: ID of the user performing the operation

        Returns:
            Updated Inventory instance

        Raises:
            HTTPException: If inventory not found or validation fails
        """
        # Get inventory with lock to prevent race conditions
        inventory = await self.inventory_repo.get_by_lpn_with_lock(
            lpn=move_data.lpn,
            tenant_id=tenant_id
        )

        if not inventory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory with LPN '{move_data.lpn}' not found"
            )

        # Validate destination location
        from repositories.location_repository import LocationRepository
        location_repo = LocationRepository(self.db)
        to_location = await location_repo.get_by_id(
            location_id=move_data.to_location_id,
            tenant_id=tenant_id
        )
        if not to_location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Destination location with ID {move_data.to_location_id} not found"
            )

        # Store original location for transaction
        from_location_id = inventory.location_id

        # Update inventory location
        inventory.location_id = move_data.to_location_id
        inventory.updated_at = datetime.utcnow()

        updated_inventory = await self.inventory_repo.update(inventory)

        # Create transaction record
        transaction = InventoryTransaction(
            tenant_id=tenant_id,
            transaction_type=TransactionType.MOVE,
            product_id=inventory.product_id,
            from_location_id=from_location_id,
            to_location_id=move_data.to_location_id,
            inventory_id=inventory.id,
            quantity=move_data.quantity or inventory.quantity,
            reference_doc=move_data.reference_doc,
            performed_by=user_id,
            timestamp=datetime.utcnow(),
            billing_metadata={
                "operation": "move",
                "lpn": move_data.lpn
            }
        )

        await self.transaction_repo.create(transaction)

        return updated_inventory

    async def adjust_stock(
        self,
        adjust_data: InventoryAdjustRequest,
        tenant_id: int,
        user_id: int
    ) -> Inventory:
        """
        Adjust inventory quantity.

        Uses row-level locking to prevent race conditions.

        Args:
            adjust_data: Adjustment request data
            tenant_id: ID of the tenant
            user_id: ID of the user performing the operation

        Returns:
            Updated Inventory instance

        Raises:
            HTTPException: If inventory not found or invalid quantity
        """
        # Get inventory with lock
        inventory = await self.inventory_repo.get_by_lpn_with_lock(
            lpn=adjust_data.lpn,
            tenant_id=tenant_id
        )

        if not inventory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory with LPN '{adjust_data.lpn}' not found"
            )

        # Validate new quantity is non-negative
        if adjust_data.quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity cannot be negative"
            )

        # Store original quantity for transaction
        original_quantity = inventory.quantity

        # Update inventory quantity
        inventory.quantity = adjust_data.quantity
        inventory.updated_at = datetime.utcnow()

        updated_inventory = await self.inventory_repo.update(inventory)

        # Create transaction record (use absolute quantity difference)
        quantity_delta = abs(adjust_data.quantity - original_quantity)

        transaction = InventoryTransaction(
            tenant_id=tenant_id,
            transaction_type=TransactionType.ADJUSTMENT,
            product_id=inventory.product_id,
            from_location_id=None,
            to_location_id=None,
            inventory_id=inventory.id,
            quantity=quantity_delta,
            reference_doc=adjust_data.reference_doc,
            performed_by=user_id,
            timestamp=datetime.utcnow(),
            billing_metadata={
                "operation": "adjustment",
                "lpn": adjust_data.lpn,
                "original_quantity": str(original_quantity),
                "new_quantity": str(adjust_data.quantity),
                "reason": adjust_data.reason
            }
        )

        await self.transaction_repo.create(transaction)

        return updated_inventory

    async def correct_transaction(
        self,
        original_transaction_id: int,
        new_quantity: Decimal,
        tenant_id: int,
        user_id: int,
        reason: Optional[str] = None
    ) -> InventoryTransaction:
        """
        Create a compensating transaction to correct a previous transaction.

        This method implements immutable ledger pattern by creating a CORRECTION
        transaction instead of modifying the original transaction.

        Args:
            original_transaction_id: ID of the transaction to correct
            new_quantity: The corrected quantity value
            tenant_id: ID of the tenant
            user_id: ID of the user performing the correction
            reason: Optional reason for the correction

        Returns:
            The newly created CORRECTION transaction

        Raises:
            HTTPException: If original transaction not found or validation fails
        """
        # Fetch the original transaction
        original_transaction = await self.transaction_repo.get_by_id(
            transaction_id=original_transaction_id,
            tenant_id=tenant_id
        )

        if not original_transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction with ID {original_transaction_id} not found"
            )

        # Calculate the delta (difference between new and original quantity)
        original_quantity = original_transaction.quantity
        quantity_diff = new_quantity - original_quantity

        # Validate that there's actually a difference
        if quantity_diff == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New quantity is the same as the original quantity. No correction needed."
            )

        # Get the inventory with lock to prevent race conditions
        inventory = await self.inventory_repo.get_by_id_with_lock(
            inventory_id=original_transaction.inventory_id,
            tenant_id=tenant_id
        )

        if not inventory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory with ID {original_transaction.inventory_id} not found"
            )

        # Update the inventory quantity based on the correction
        # The diff can be positive (increase) or negative (decrease)
        new_inventory_quantity = inventory.quantity + quantity_diff

        if new_inventory_quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Correction would result in negative inventory quantity ({new_inventory_quantity})"
            )

        # Update inventory
        inventory.quantity = new_inventory_quantity
        inventory.updated_at = datetime.utcnow()
        await self.inventory_repo.update(inventory)

        # Create the CORRECTION transaction
        # Note: quantity field stores the absolute value of the diff for tracking purposes
        now = datetime.utcnow()
        correction_transaction = InventoryTransaction(
            tenant_id=tenant_id,
            transaction_type=TransactionType.CORRECTION,
            product_id=original_transaction.product_id,
            from_location_id=original_transaction.from_location_id,
            to_location_id=original_transaction.to_location_id,
            inventory_id=original_transaction.inventory_id,
            quantity=abs(quantity_diff),  # Store absolute value
            reference_doc=f"CORRECTION-{original_transaction_id}",
            performed_by=user_id,
            timestamp=now,
            billing_metadata={
                "operation": "correction",
                "original_transaction_id": original_transaction_id,
                "original_quantity": str(original_quantity),
                "corrected_quantity": str(new_quantity),
                "quantity_diff": str(quantity_diff),
                "adjustment_type": "increase" if quantity_diff > 0 else "decrease",
                "reason": reason or "Manual correction",
                "lpn": inventory.lpn
            }
        )

        created_correction = await self.transaction_repo.create(correction_transaction)

        return created_correction
