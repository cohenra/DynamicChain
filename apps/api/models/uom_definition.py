from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class UomDefinition(Base):
    """Unit of Measure Definition - Dictionary of standardized UOMs."""

    __tablename__ = "uom_definitions"

    # Table constraints
    __table_args__ = (
        UniqueConstraint('tenant_id', 'code', name='uq_tenant_uom_code'),
        Index('ix_uom_definitions_tenant_id', 'tenant_id'),
        Index('ix_uom_definitions_code', 'code'),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
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
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="uom_definitions")
    products: Mapped[list["Product"]] = relationship(
        "Product",
        back_populates="base_uom",
        foreign_keys="Product.base_uom_id"
    )
    product_uoms: Mapped[list["ProductUOM"]] = relationship(
        "ProductUOM",
        back_populates="uom",
        foreign_keys="ProductUOM.uom_id"
    )

    def __repr__(self) -> str:
        return f"<UomDefinition(id={self.id}, code='{self.code}', name='{self.name}')>"
