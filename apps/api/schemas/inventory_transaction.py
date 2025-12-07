from datetime import datetime
from typing import Optional, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field
from models.inventory_transaction import TransactionType


class InventoryTransactionCorrectionRequest(BaseModel):
    """Schema for correcting an inventory transaction."""
    new_quantity: Decimal = Field(..., gt=0, description="Corrected quantity value")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for the correction")


class InventoryTransactionResponse(BaseModel):
    """Schema for inventory transaction response."""
    id: int
    tenant_id: int
    transaction_type: TransactionType
    product_id: int
    from_location_id: Optional[int]
    to_location_id: Optional[int]
    inventory_id: int
    quantity: Decimal
    reference_doc: Optional[str]
    performed_by: int
    timestamp: datetime
    billing_metadata: Dict[str, Any]

    # Populated fields
    product_sku: Optional[str] = Field(None, description="Product SKU")
    product_name: Optional[str] = Field(None, description="Product name")
    inventory_lpn: Optional[str] = Field(None, description="Inventory LPN")
    from_location_name: Optional[str] = Field(None, description="From location name")
    to_location_name: Optional[str] = Field(None, description="To location name")
    performed_by_name: Optional[str] = Field(None, description="User who performed the transaction")

    class Config:
        from_attributes = True


class InventoryTransactionListResponse(BaseModel):
    """Schema for paginated transaction list."""
    items: list[InventoryTransactionResponse]
    total: int
    skip: int
    limit: int
