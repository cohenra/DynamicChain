from datetime import datetime
from enum import Enum
from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class InboundShipmentStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    ARRIVED = "ARRIVED"
    RECEIVING = "RECEIVING"
    CLOSED = "CLOSED"


class InboundShipment(Base):
    """Physical shipment (container/truck) for inbound order."""

    __tablename__ = "inbound_shipments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    inbound_order_id = Column(BigInteger, ForeignKey("inbound_orders.id"), nullable=False, index=True)

    shipment_number = Column(String(50), nullable=False, unique=True, index=True)
    
    # --- תיקון: native_enum=False ---
    status = Column(SQLEnum(InboundShipmentStatus, native_enum=False, length=50), nullable=False, default=InboundShipmentStatus.SCHEDULED)

    container_number = Column(String(50), nullable=True)  # Container or truck ID
    driver_details = Column(Text, nullable=True)  # Driver name/phone

    arrival_date = Column(DateTime, nullable=True)
    closed_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    inbound_order = relationship("InboundOrder", back_populates="shipments")
    transactions = relationship("InventoryTransaction", back_populates="inbound_shipment")

    __table_args__ = (
        {"comment": "Physical shipments for inbound orders"}
    )