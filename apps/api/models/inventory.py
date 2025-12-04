from datetime import datetime, date
from enum import Enum
from typing import Optional
from decimal import Decimal
from sqlalchemy import String, Integer, BigInteger, ForeignKey, DateTime, Date, Numeric, UniqueConstraint, Index, Enum as SQLEnum, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class InventoryStatus(str, Enum):
    """Inventory status enumeration."""
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    QUARANTINE = "QUARANTINE"
    DAMAGED = "DAMAGED"
    MISSING = "MISSING"

class Inventory(Base):
    """
    Inventory model - Current stock snapshot (Quants/LPNs).
    """
    __tablename__ = "inventory"

    __table_args__ = (
        UniqueConstraint('tenant_id', 'lpn', name='uq_tenant_lpn'),
        CheckConstraint('quantity >= 0', name='ck_inventory_quantity_positive'),
        Index('ix_inventory_tenant_id', 'tenant_id'),
        Index('ix_inventory_depositor_id', 'depositor_id'),
        Index('ix_inventory_product_id', 'product_id'),
        Index('ix_inventory_location_id', 'location_id'),
        Index('ix_inventory_lpn', 'lpn'),
        Index('ix_inventory_status', 'status'),
        Index('ix_inventory_batch_number', 'batch_number'),
        Index('ix_inventory_expiry_date', 'expiry_date'),
        Index('ix_inventory_fifo_date', 'fifo_date'),
        Index('ix_inventory_tenant_product', 'tenant_id', 'product_id'),
        Index('ix_inventory_tenant_location', 'tenant_id', 'location_id'),
        Index('ix_inventory_tenant_depositor', 'tenant_id', 'depositor_id'),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    depositor_id: Mapped[int] = mapped_column(Integer, ForeignKey("depositors.id", ondelete="RESTRICT"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    location_id: Mapped[int] = mapped_column(Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    
    lpn: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=6), nullable=False)
    
    # --- התיקון הקריטי: native_enum=False ---
    status: Mapped[InventoryStatus] = mapped_column(
        SQLEnum(InventoryStatus, native_enum=False, length=50),
        nullable=False,
        default=InventoryStatus.AVAILABLE
    )

    batch_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    fifo_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="inventory")
    depositor: Mapped["Depositor"] = relationship("Depositor", back_populates="inventory")
    product: Mapped["Product"] = relationship("Product", back_populates="inventory")
    location: Mapped["Location"] = relationship("Location", back_populates="inventory")
    transactions: Mapped[list["InventoryTransaction"]] = relationship(
        "InventoryTransaction",
        back_populates="inventory",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Inventory(id={self.id}, lpn='{self.lpn}', product_id={self.product_id}, qty={self.quantity}, status='{self.status}')>"