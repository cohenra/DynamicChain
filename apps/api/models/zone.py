from datetime import datetime
from typing import TYPE_CHECKING, List
from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

if TYPE_CHECKING:
    from models.tenant import Tenant
    from models.warehouse import Warehouse
    from models.location import Location


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    warehouse_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="zones")
    warehouse: Mapped["Warehouse"] = relationship("Warehouse", back_populates="zones")
    locations: Mapped[List["Location"]] = relationship(
        "Location", back_populates="zone", cascade="all, delete-orphan"
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint("tenant_id", "warehouse_id", "code", name="uq_zone_code_per_warehouse"),
        Index("ix_zones_tenant_id", "tenant_id"),
        Index("ix_zones_warehouse_id", "warehouse_id"),
    )

    def __repr__(self):
        return f"<Zone(id={self.id}, code={self.code}, name={self.name})>"
