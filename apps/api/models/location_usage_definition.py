from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class LocationUsageDefinition(Base):
    """Location Usage Definition - Dictionary of standardized Location Usages."""

    __tablename__ = "location_usage_definitions"

    # Table constraints
    __table_args__ = (
        UniqueConstraint('tenant_id', 'code', name='uq_tenant_location_usage_code'),
        Index('ix_location_usage_definitions_tenant_id', 'tenant_id'),
        Index('ix_location_usage_definitions_code', 'code'),
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
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="location_usage_definitions")
    locations: Mapped[list["Location"]] = relationship(
        "Location",
        back_populates="usage_definition",
        foreign_keys="Location.usage_id"
    )

    def __repr__(self) -> str:
        return f"<LocationUsageDefinition(id={self.id}, code='{self.code}', name='{self.name}')>"
