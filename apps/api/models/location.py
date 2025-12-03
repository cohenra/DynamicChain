from datetime import datetime
from typing import TYPE_CHECKING
import enum
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

if TYPE_CHECKING:
    from models.tenant import Tenant
    from models.warehouse import Warehouse
    from models.zone import Zone


class LocationType(str, enum.Enum):
    SHELF = "SHELF"
    PALLET_RACK = "PALLET_RACK"
    FLOOR = "FLOOR"
    CAGED = "CAGED"


class LocationUsage(str, enum.Enum):
    PICKING = "PICKING"
    STORAGE = "STORAGE"
    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"
    HANDOFF = "HANDOFF"
    QUARANTINE = "QUARANTINE"


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    warehouse_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    zone_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # Barcode like A-01-01-01
    aisle: Mapped[str] = mapped_column(String(50), nullable=False)
    bay: Mapped[str] = mapped_column(String(50), nullable=False)
    level: Mapped[str] = mapped_column(String(50), nullable=False)
    slot: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[LocationType] = mapped_column(
        Enum(LocationType, name="location_type_enum"), nullable=False
    )
    usage: Mapped[LocationUsage] = mapped_column(
        Enum(LocationUsage, name="location_usage_enum"), nullable=False
    )
    pick_sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="locations")
    warehouse: Mapped["Warehouse"] = relationship("Warehouse", back_populates="locations")
    zone: Mapped["Zone"] = relationship("Zone", back_populates="locations")

    # Constraints
    __table_args__ = (
        UniqueConstraint("warehouse_id", "name", name="uq_location_name_per_warehouse"),
        Index("ix_locations_tenant_id", "tenant_id"),
        Index("ix_locations_warehouse_id", "warehouse_id"),
        Index("ix_locations_zone_id", "zone_id"),
        Index("ix_locations_usage", "usage"),
    )

    def __repr__(self):
        return f"<Location(id={self.id}, name={self.name}, usage={self.usage.value})>"
