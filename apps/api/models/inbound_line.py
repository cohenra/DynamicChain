from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class InboundLine(Base):
    """Inbound order line item."""

    __tablename__ = "inbound_lines"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    inbound_order_id = Column(BigInteger, ForeignKey("inbound_orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    uom_id = Column(Integer, ForeignKey("uom_definitions.id"), nullable=False)

    expected_quantity = Column(Numeric(15, 3), nullable=False)
    received_quantity = Column(Numeric(15, 3), nullable=False, default=Decimal('0'))

    expected_batch = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships with eager loading
    inbound_order = relationship("InboundOrder", back_populates="lines")
    product = relationship("Product", lazy="joined")  # Always load product
    uom = relationship("UomDefinition", lazy="joined")  # Always load UOM

    __table_args__ = (
        {"comment": "Line items for inbound orders"}
    )
