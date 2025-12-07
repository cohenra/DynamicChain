from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum as SQLEnum, Date, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from database import Base


class InboundOrderType(str, Enum):
    SUPPLIER_DELIVERY = "SUPPLIER_DELIVERY"
    CUSTOMER_RETURN = "CUSTOMER_RETURN"
    TRANSFER_IN = "TRANSFER_IN"


class InboundOrderStatus(str, Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    COMPLETED = "COMPLETED"
    SHORT_CLOSED = "SHORT_CLOSED"  # Closed with incomplete items
    CANCELLED = "CANCELLED"


class InboundOrder(Base):
    """Inbound order header."""

    __tablename__ = "inbound_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("depositors.id"), nullable=True)

    order_number = Column(String(50), nullable=False, index=True)
    
    # --- תיקון: native_enum=False כדי למנוע שגיאות DB ---
    order_type = Column(SQLEnum(InboundOrderType, native_enum=False, length=50), nullable=False)
    status = Column(SQLEnum(InboundOrderStatus, native_enum=False, length=50), nullable=False, default=InboundOrderStatus.DRAFT)

    supplier_name = Column(String(200), nullable=True)
    
    # ForeignKey הוסר זמנית עד שיהיה מודול Outbound
    linked_outbound_order_id = Column(BigInteger, nullable=True)
    
    expected_delivery_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="inbound_orders")
    
    lines = relationship(
        "InboundLine",
        back_populates="inbound_order",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    shipments = relationship(
        "InboundShipment",
        back_populates="inbound_order",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    customer = relationship("Depositor", foreign_keys=[customer_id], lazy="joined")

    __table_args__ = (
        {"comment": "Inbound orders for receiving inventory"}
    )