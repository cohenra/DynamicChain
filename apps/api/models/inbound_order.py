from datetime import datetime, date
from enum import Enum
from typing import Optional
from sqlalchemy import String, Integer, BigInteger, ForeignKey, DateTime, Date, Text, UniqueConstraint, Index, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class InboundOrderType(str, Enum):
    """Inbound order type enumeration."""
    PURCHASE_ORDER = "PURCHASE_ORDER"
    ASN = "ASN"
    CUSTOMER_RETURN = "CUSTOMER_RETURN"
    TRANSFER_IN = "TRANSFER_IN"


class InboundOrderStatus(str, Enum):
    """Inbound order status enumeration."""
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class InboundOrder(Base):
    """
    Inbound Order model - Represents the header of a PO, ASN, or Return.
    This is the "plan" for bringing goods into the warehouse.
    """

    __tablename__ = "inbound_orders"

    # Table constraints
    __table_args__ = (
        UniqueConstraint('tenant_id', 'order_number', name='uq_tenant_inbound_order_number'),
        Index('ix_inbound_orders_tenant_id', 'tenant_id'),
        Index('ix_inbound_orders_order_number', 'order_number'),
        Index('ix_inbound_orders_status', 'status'),
        Index('ix_inbound_orders_order_type', 'order_type'),
        Index('ix_inbound_orders_expected_delivery', 'expected_delivery_date'),
    )

    # Primary Key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)

    # Foreign Keys
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    customer_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("depositors.id", ondelete="RESTRICT"), nullable=True)

    # Core Fields
    order_number: Mapped[str] = mapped_column(String(100), nullable=False)

    order_type: Mapped[InboundOrderType] = mapped_column(
        SQLEnum(InboundOrderType, native_enum=False, length=50),
        nullable=False
    )

    status: Mapped[InboundOrderStatus] = mapped_column(
        SQLEnum(InboundOrderStatus, native_enum=False, length=50),
        nullable=False,
        default=InboundOrderStatus.DRAFT
    )

    # Optional Fields
    supplier_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linked_outbound_order_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="inbound_orders")
    customer: Mapped["Depositor"] = relationship("Depositor", foreign_keys=[customer_id])
    lines: Mapped[list["InboundLine"]] = relationship(
        "InboundLine",
        back_populates="inbound_order",
        cascade="all, delete-orphan"
    )
    shipments: Mapped[list["InboundShipment"]] = relationship(
        "InboundShipment",
        back_populates="inbound_order",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<InboundOrder(id={self.id}, order_number='{self.order_number}', type='{self.order_type}', status='{self.status}')>"
