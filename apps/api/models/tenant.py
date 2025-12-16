from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Tenant(Base):
    """Tenant model for multi-tenancy support."""

    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    users: Mapped[list["User"]] = relationship(
        "User",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    products: Mapped[list["Product"]] = relationship(
        "Product",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    depositors: Mapped[list["Depositor"]] = relationship(
        "Depositor",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    warehouses: Mapped[list["Warehouse"]] = relationship(
        "Warehouse",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    product_uoms: Mapped[list["ProductUOM"]] = relationship(
        "ProductUOM",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    uom_definitions: Mapped[list["UomDefinition"]] = relationship(
        "UomDefinition",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    location_type_definitions: Mapped[list["LocationTypeDefinition"]] = relationship(
        "LocationTypeDefinition",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    location_usage_definitions: Mapped[list["LocationUsageDefinition"]] = relationship(
        "LocationUsageDefinition",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    zones: Mapped[list["Zone"]] = relationship(
        "Zone",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    locations: Mapped[list["Location"]] = relationship(
        "Location",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    inventory: Mapped[list["Inventory"]] = relationship(
        "Inventory",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    inventory_transactions: Mapped[list["InventoryTransaction"]] = relationship(
        "InventoryTransaction",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["SystemAuditLog"]] = relationship(
        "SystemAuditLog",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    inbound_orders: Mapped[list["InboundOrder"]] = relationship(
        "InboundOrder",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    allocation_strategies: Mapped[list["AllocationStrategy"]] = relationship(
        "AllocationStrategy",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    outbound_waves: Mapped[list["OutboundWave"]] = relationship(
        "OutboundWave",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    outbound_orders: Mapped[list["OutboundOrder"]] = relationship(
        "OutboundOrder",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    order_type_definitions: Mapped[list["OrderTypeDefinition"]] = relationship(
        "OrderTypeDefinition",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Tenant(id={self.id}, name='{self.name}')>"
