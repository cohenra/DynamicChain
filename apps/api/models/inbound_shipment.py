from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from sqlalchemy import String, BigInteger, ForeignKey, DateTime, Text, Index, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class InboundShipmentStatus(str, Enum):
    """Inbound shipment status enumeration."""
    SCHEDULED = "SCHEDULED"
    ARRIVED = "ARRIVED"
    RECEIVING = "RECEIVING"
    CLOSED = "CLOSED"


class InboundShipment(Base):
    """
    Inbound Shipment model - Represents a specific truck, container, or delivery for an order.
    One InboundOrder can have multiple InboundShipments (e.g., a huge PO split into 3 containers).
    """

    __tablename__ = "inbound_shipments"

    # Table constraints
    __table_args__ = (
        Index('ix_inbound_shipments_inbound_order_id', 'inbound_order_id'),
        Index('ix_inbound_shipments_shipment_number', 'shipment_number'),
        Index('ix_inbound_shipments_status', 'status'),
        Index('ix_inbound_shipments_arrival_date', 'arrival_date'),
    )

    # Primary Key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)

    # Foreign Keys
    inbound_order_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("inbound_orders.id", ondelete="CASCADE"),
        nullable=False
    )

    # Core Fields
    shipment_number: Mapped[str] = mapped_column(String(100), nullable=False)

    status: Mapped[InboundShipmentStatus] = mapped_column(
        SQLEnum(InboundShipmentStatus, native_enum=False, length=50),
        nullable=False,
        default=InboundShipmentStatus.SCHEDULED
    )

    # Logistics Details
    driver_details: Mapped[Dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    arrival_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    closed_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    inbound_order: Mapped["InboundOrder"] = relationship("InboundOrder", back_populates="shipments")
    transactions: Mapped[list["InventoryTransaction"]] = relationship(
        "InventoryTransaction",
        back_populates="inbound_shipment"
    )

    def __repr__(self) -> str:
        return f"<InboundShipment(id={self.id}, shipment_number='{self.shipment_number}', order_id={self.inbound_order_id}, status='{self.status}')>"
