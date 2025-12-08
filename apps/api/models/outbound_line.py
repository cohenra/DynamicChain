from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database import Base


class OutboundLine(Base):
    """
    Outbound Line - The Item in an order.
    Tracks quantities through the fulfillment lifecycle and allocation constraints.
    """

    __tablename__ = "outbound_lines"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("outbound_orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    uom_id = Column(Integer, ForeignKey("uom_definitions.id"), nullable=False)

    # Quantities through the lifecycle
    qty_ordered = Column(Numeric(15, 3), nullable=False)
    qty_allocated = Column(Numeric(15, 3), nullable=False, default=Decimal('0'))
    qty_picked = Column(Numeric(15, 3), nullable=False, default=Decimal('0'))
    qty_packed = Column(Numeric(15, 3), nullable=False, default=Decimal('0'))
    qty_shipped = Column(Numeric(15, 3), nullable=False, default=Decimal('0'))

    # Allocation constraints - CRITICAL for strategy matching
    # Structure: {batch_number, min_expiry, serial_number, grade, zone_preference}
    constraints = Column(JSONB, nullable=True, default={})

    # Line-level status (supports split status within order)
    line_status = Column(String(50), nullable=True, index=True)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships with eager loading
    order = relationship("OutboundOrder", back_populates="lines")
    product = relationship("Product", lazy="joined")  # Always load product
    uom = relationship("UomDefinition", lazy="joined")  # Always load UOM
    pick_tasks = relationship(
        "PickTask",
        back_populates="line",
        lazy="selectin"
    )

    __table_args__ = (
        {"comment": "Line items for outbound orders"}
    )
