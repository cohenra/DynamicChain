from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class Product(Base):
    """Product model with dynamic attributes support."""

    __tablename__ = "products"

    # Table constraints
    __table_args__ = (
        UniqueConstraint('tenant_id', 'sku', name='uq_tenant_sku'),
        Index('ix_products_tenant_id', 'tenant_id'),
        Index('ix_products_sku', 'sku'),
        Index('ix_products_depositor_id', 'depositor_id'),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False
    )
    depositor_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("depositors.id", ondelete="CASCADE"),
        nullable=True  # Nullable for migration purposes
    )
    sku: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    barcode: Mapped[str | None] = mapped_column(String(255), nullable=True)
    base_uom_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("uom_definitions.id", ondelete="SET NULL"),
        nullable=True
    )
    custom_attributes: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}"
    )
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
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="products")
    depositor: Mapped[Optional["Depositor"]] = relationship("Depositor", back_populates="products")
    base_uom: Mapped[Optional["UomDefinition"]] = relationship(
        "UomDefinition",
        back_populates="products",
        foreign_keys=[base_uom_id]
    )
    uoms: Mapped[list["ProductUOM"]] = relationship(
        "ProductUOM",
        back_populates="product",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, sku='{self.sku}', name='{self.name}')>"
