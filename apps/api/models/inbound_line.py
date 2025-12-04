from datetime import datetime
from typing import Optional
from decimal import Decimal
from sqlalchemy import String, Integer, BigInteger, ForeignKey, DateTime, Text, Numeric, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class InboundLine(Base):
    """
    Inbound Line model - Represents what we expect to receive.
    Links to the parent InboundOrder and specifies expected vs actual quantities.
    """

    __tablename__ = "inbound_lines"

    # Table constraints
    __table_args__ = (
        CheckConstraint('expected_quantity > 0', name='ck_inbound_line_expected_qty_positive'),
        CheckConstraint('received_quantity >= 0', name='ck_inbound_line_received_qty_nonnegative'),
        Index('ix_inbound_lines_inbound_order_id', 'inbound_order_id'),
        Index('ix_inbound_lines_product_id', 'product_id'),
    )

    # Primary Key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)

    # Foreign Keys
    inbound_order_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("inbound_orders.id", ondelete="CASCADE"),
        nullable=False
    )
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    uom_id: Mapped[int] = mapped_column(Integer, ForeignKey("uom_definitions.id", ondelete="RESTRICT"), nullable=False)

    # Core Fields
    expected_quantity: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=6), nullable=False)
    received_quantity: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=6), nullable=False, default=Decimal('0'))

    # Optional Tracking Fields
    expected_batch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    inbound_order: Mapped["InboundOrder"] = relationship("InboundOrder", back_populates="lines")
    product: Mapped["Product"] = relationship("Product")
    uom: Mapped["UOMDefinition"] = relationship("UOMDefinition")

    def __repr__(self) -> str:
        return f"<InboundLine(id={self.id}, order_id={self.inbound_order_id}, product_id={self.product_id}, expected={self.expected_quantity}, received={self.received_quantity})>"
