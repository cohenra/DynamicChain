from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional
from decimal import Decimal
from sqlalchemy import String, Integer, BigInteger, ForeignKey, DateTime, Numeric, Index, Enum as SQLEnum, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class TransactionType(str, Enum):
    """Inventory transaction type enumeration."""
    INBOUND_RECEIVE = "INBOUND_RECEIVE"
    PUTAWAY = "PUTAWAY"
    MOVE = "MOVE"
    PICK = "PICK"
    SHIP = "SHIP"
    ADJUSTMENT = "ADJUSTMENT"
    STATUS_CHANGE = "STATUS_CHANGE"
    PALLET_SPLIT = "PALLET_SPLIT"
    PALLET_MERGE = "PALLET_MERGE"


class InventoryTransaction(Base):
    """
    Inventory Transaction model - The immutable ledger.
    """

    __tablename__ = "inventory_transactions"

    # Table constraints
    __table_args__ = (
        CheckConstraint('quantity > 0', name='ck_transaction_quantity_positive'),
        Index('ix_inventory_transactions_tenant_id', 'tenant_id'),
        Index('ix_inventory_transactions_transaction_type', 'transaction_type'),
        Index('ix_inventory_transactions_product_id', 'product_id'),
        Index('ix_inventory_transactions_inventory_id', 'inventory_id'),
        Index('ix_inventory_transactions_performed_by', 'performed_by'),
        Index('ix_inventory_transactions_timestamp', 'timestamp'),
        Index('ix_inventory_transactions_reference_doc', 'reference_doc'),
        Index('ix_inventory_transactions_tenant_timestamp', 'tenant_id', 'timestamp'),
        Index('ix_inventory_transactions_tenant_product', 'tenant_id', 'product_id'),
        Index('ix_inventory_transactions_inbound_shipment_id', 'inbound_shipment_id'),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)

    # Foreign Keys
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    from_location_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=True)
    to_location_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=True)
    inventory_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("inventory.id", ondelete="RESTRICT"), nullable=False)
    performed_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    inbound_shipment_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("inbound_shipments.id", ondelete="SET NULL"), nullable=True)

    # --- התיקון הקריטי כאן: native_enum=False ---
    transaction_type: Mapped[TransactionType] = mapped_column(
        SQLEnum(TransactionType, native_enum=False, length=50),
        nullable=False
    )
    
    quantity: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=6), nullable=False)
    reference_doc: Mapped[str | None] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Billing Metadata
    billing_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}"
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="inventory_transactions")
    product: Mapped["Product"] = relationship("Product", back_populates="inventory_transactions")
    from_location: Mapped[Optional["Location"]] = relationship("Location", foreign_keys=[from_location_id], back_populates="transactions_from")
    to_location: Mapped[Optional["Location"]] = relationship("Location", foreign_keys=[to_location_id], back_populates="transactions_to")
    inventory: Mapped["Inventory"] = relationship("Inventory", back_populates="transactions")
    performed_by_user: Mapped["User"] = relationship("User", back_populates="inventory_transactions")
    inbound_shipment: Mapped[Optional["InboundShipment"]] = relationship("InboundShipment", back_populates="transactions")

    def __repr__(self) -> str:
        return f"<InventoryTransaction(id={self.id}, type='{self.transaction_type}', inventory_id={self.inventory_id}, qty={self.quantity})>"