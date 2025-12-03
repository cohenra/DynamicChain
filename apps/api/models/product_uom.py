from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class ProductUOM(Base):
    """Product Unit of Measure model for packaging levels."""

    __tablename__ = "product_uoms"

    # Table constraints
    __table_args__ = (
        UniqueConstraint('product_id', 'uom_name', name='uq_product_uom_name'),
        UniqueConstraint('tenant_id', 'barcode', name='uq_tenant_barcode'),
        Index('ix_product_uoms_product_id', 'product_id'),
        Index('ix_product_uoms_tenant_id', 'tenant_id'),
        Index('ix_product_uoms_barcode', 'barcode'),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False
    )
    uom_name: Mapped[str] = mapped_column(String(100), nullable=False)
    conversion_factor: Mapped[float] = mapped_column(Float, nullable=False)
    barcode: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    length: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    width: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    height: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    volume: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="product_uoms")
    product: Mapped["Product"] = relationship("Product", back_populates="uoms")

    def __repr__(self) -> str:
        return f"<ProductUOM(id={self.id}, product_id={self.product_id}, uom_name='{self.uom_name}', conversion_factor={self.conversion_factor})>"
