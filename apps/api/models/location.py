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
    from models.location_type_definition import LocationTypeDefinition
    from models.location_usage_definition import LocationUsageDefinition


# Legacy enums - kept for reference and backwards compatibility
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
    type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("location_type_definitions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    usage_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("location_usage_definitions.id", ondelete="RESTRICT"), nullable=False, index=True
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
    type_definition: Mapped["LocationTypeDefinition"] = relationship(
        "LocationTypeDefinition",
        back_populates="locations",
        foreign_keys=[type_id]
    )
    usage_definition: Mapped["LocationUsageDefinition"] = relationship(
        "LocationUsageDefinition",
        back_populates="locations",
        foreign_keys=[usage_id]
    )
    inventory: Mapped[list["Inventory"]] = relationship(
        "Inventory",
        back_populates="location",
        cascade="all, delete-orphan"
    )
    transactions_from: Mapped[list["InventoryTransaction"]] = relationship(
        "InventoryTransaction",
        foreign_keys="[InventoryTransaction.from_location_id]",
        back_populates="from_location"
    )
    transactions_to: Mapped[list["InventoryTransaction"]] = relationship(
        "InventoryTransaction",
        foreign_keys="[InventoryTransaction.to_location_id]",
        back_populates="to_location"
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint("warehouse_id", "name", name="uq_location_name_per_warehouse"),
        Index("ix_locations_tenant_id", "tenant_id"),
        Index("ix_locations_warehouse_id", "warehouse_id"),
        Index("ix_locations_zone_id", "zone_id"),
        Index("ix_locations_type_id", "type_id"),
        Index("ix_locations_usage_id", "usage_id"),
    )

    def __repr__(self):
        return f"<Location(id={self.id}, name={self.name}, usage_id={self.usage_id})>"
