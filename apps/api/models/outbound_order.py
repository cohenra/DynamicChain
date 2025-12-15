from datetime import datetime
from enum import Enum, IntEnum
from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Date, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database import Base


class OutboundOrderStatus(str, Enum):
    """Status enum for outbound orders."""
    DRAFT = "DRAFT"
    VERIFIED = "VERIFIED"
    PLANNED = "PLANNED"  # Allocated
    RELEASED = "RELEASED"  # Tasks active
    PICKING = "PICKING"
    PICKED = "PICKED"  # Done picking
    PACKED = "PACKED"
    SHIPPED = "SHIPPED"
    CANCELLED = "CANCELLED"


class OrderType(str, Enum):
    """Types of outbound orders."""
    CUSTOMER_ORDER = "CUSTOMER_ORDER"
    B2B = "B2B"
    ECOM = "ECOM"
    TRANSFER = "TRANSFER"
    RETURN = "RETURN"
    RETAIL = "RETAIL"


class OrderPriority(IntEnum):
    """Priority levels for orders (Higher number = Higher priority)."""
    LOW = 1
    NORMAL = 2
    STANDARD = 3  # Added to fix validation error (Value 3 exists in DB)
    MEDIUM = 5
    HIGH = 10
    CRITICAL = 20


class OutboundOrder(Base):
    """
    Outbound Order - The Header for customer orders.
    Tracks the full lifecycle from draft to shipped with comprehensive auditing.
    """

    __tablename__ = "outbound_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    order_number = Column(String(50), nullable=False, index=True, unique=True)

    # Customer (Depositor)
    customer_id = Column(Integer, ForeignKey("depositors.id"), nullable=False, index=True)

    # Wave association (nullable - order can exist without a wave)
    wave_id = Column(BigInteger, ForeignKey("outbound_waves.id"), nullable=True, index=True)

    status = Column(
        SQLEnum(OutboundOrderStatus, native_enum=False, length=50),
        nullable=False,
        default=OutboundOrderStatus.DRAFT,
        index=True
    )

    # Critical for strategy mapping (e.g., "B2B", "ECOM", "RETAIL")
    order_type = Column(String(50), nullable=False, index=True, default=OrderType.CUSTOMER_ORDER.value)

    # Priority for sorting
    priority = Column(Integer, nullable=False, default=OrderPriority.MEDIUM.value)

    # Important dates for SLA billing
    requested_delivery_date = Column(Date, nullable=True)
    status_changed_at = Column(DateTime, nullable=True)

    # Shipping details stored as JSONB for flexibility
    shipping_details = Column(JSONB, nullable=True)

    # Metrics stored as JSONB for BI and billing
    metrics = Column(JSONB, nullable=True, default={})

    notes = Column(Text, nullable=True)

    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="outbound_orders")
    customer = relationship("Depositor", foreign_keys=[customer_id], lazy="joined")
    wave = relationship("OutboundWave", back_populates="orders")
    lines = relationship(
        "OutboundLine",
        back_populates="order",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    pick_tasks = relationship(
        "PickTask",
        back_populates="order",
        lazy="selectin"
    )
    created_by_user = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        {"comment": "Outbound orders for customer fulfillment"}
    )