"""
OrderTypeDefinition Model - Dynamic order types for outbound orders.
Replaces the hardcoded OrderType enum with a database-driven approach.
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class OrderTypeBehavior(str, Enum):
    """
    Behavior keys that map to internal business logic.
    These determine how the allocation, picking, and packing processes handle the order.
    """
    B2B = "B2B"           # Business-to-business: bulk picks, pallet shipping
    ECOM = "ECOM"         # E-commerce: small parcel, individual picks
    TRANSFER = "TRANSFER" # Internal transfer: warehouse to warehouse
    RETAIL = "RETAIL"     # Retail replenishment: store orders
    RETURN = "RETURN"     # Return processing: special handling


class OrderTypeDefinition(Base):
    """
    Dynamic Order Type Definition - Allows tenants to define custom order types.

    Each order type maps to a behavior_key which determines how the system
    processes orders of this type (allocation strategy, picking method, etc.)
    """

    __tablename__ = "order_type_definitions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Unique code for the order type (e.g., "ECOM_EXPRESS", "B2B_STANDARD")
    code = Column(String(50), nullable=False, index=True)

    # Display name (e.g., "E-Commerce Express", "B2B Standard")
    name = Column(String(100), nullable=False)

    # Description for UI
    description = Column(Text, nullable=True)

    # Default priority when creating orders of this type (1-20)
    default_priority = Column(Integer, nullable=False, default=5)

    # Behavior key - maps to internal business logic
    behavior_key = Column(String(50), nullable=False, default=OrderTypeBehavior.B2B.value)

    # Is this type active/selectable?
    is_active = Column(Boolean, nullable=False, default=True)

    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="order_type_definitions")
    outbound_orders = relationship("OutboundOrder", back_populates="order_type_def")

    __table_args__ = (
        # Unique constraint: code must be unique per tenant
        {"comment": "Dynamic order type definitions for outbound orders"},
    )

    def __repr__(self) -> str:
        return f"<OrderTypeDefinition(id={self.id}, code='{self.code}', name='{self.name}')>"
