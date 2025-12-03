from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Warehouse(Base):
    """Warehouse model - represents physical warehouse locations."""

    __tablename__ = "warehouses"

    # Table constraints
    __table_args__ = (
        UniqueConstraint('tenant_id', 'code', name='uq_tenant_warehouse_code'),
        Index('ix_warehouses_tenant_id', 'tenant_id'),
        Index('ix_warehouses_code', 'code'),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
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
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="warehouses")
    zones: Mapped[list["Zone"]] = relationship(
        "Zone",
        back_populates="warehouse",
        cascade="all, delete-orphan"
    )
    locations: Mapped[list["Location"]] = relationship(
        "Location",
        back_populates="warehouse",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Warehouse(id={self.id}, code='{self.code}', name='{self.name}')>"
