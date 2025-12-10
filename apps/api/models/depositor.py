from datetime import datetime
from typing import Any, Dict
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint, Index, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class Depositor(Base):
    """Depositor model - represents clients/product owners in 3PL model."""

    __tablename__ = "depositors"

    # Table constraints
    __table_args__ = (
        UniqueConstraint('tenant_id', 'code', name='uq_tenant_depositor_code'),
        Index('ix_depositors_tenant_id', 'tenant_id'),
        Index('ix_depositors_code', 'code'),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_info: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}"
    )
    
    # New flag for over-receiving configuration
    allow_over_receiving: Mapped[bool] = mapped_column(
        Boolean, 
        default=False, 
        server_default="false",
        nullable=False
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
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="depositors")
    products: Mapped[list["Product"]] = relationship(
        "Product",
        back_populates="depositor",
        cascade="all, delete-orphan"
    )
    inventory: Mapped[list["Inventory"]] = relationship(
        "Inventory",
        back_populates="depositor",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Depositor(id={self.id}, code='{self.code}', name='{self.name}')>"