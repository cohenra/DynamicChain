from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Integer, BigInteger, ForeignKey, DateTime, Numeric, Text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class InboundLine(Base):
    """
    Inbound Line model - Represents the expected items in an order.
    """
    __tablename__ = "inbound_lines"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)
    inbound_order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("inbound_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Expected vs Actual
    expected_quantity: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=6), nullable=False)
    received_quantity: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=6), nullable=False, default=0)
    
    uom_id: Mapped[int] = mapped_column(Integer, ForeignKey("uom_definitions.id", ondelete="RESTRICT"), nullable=False)

    # Optional tracking
    expected_batch: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    inbound_order: Mapped["InboundOrder"] = relationship("InboundOrder", back_populates="lines")
    product: Mapped["Product"] = relationship("Product")
    
    # --- התיקון כאן: שימוש בשם UomDefinition (ולא UOMDefinition) ---
    uom: Mapped["UomDefinition"] = relationship("UomDefinition")

    __table_args__ = (
        CheckConstraint('expected_quantity > 0', name='ck_inbound_line_expected_qty_positive'),
        CheckConstraint('received_quantity >= 0', name='ck_inbound_line_received_qty_nonnegative'),
    )

    def __repr__(self) -> str:
        return f"<InboundLine(id={self.id}, product_id={self.product_id}, expected={self.expected_quantity})>"