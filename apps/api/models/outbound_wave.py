from datetime import datetime
from enum import Enum
from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database import Base


class OutboundWaveStatus(str, Enum):
    """Status enum for outbound waves."""
    PLANNING = "PLANNING"  # Editable
    ALLOCATED = "ALLOCATED"  # Inventory reserved
    RELEASED = "RELEASED"  # Tasks created
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class OutboundWave(Base):
    """
    Outbound Wave - The Container for batching orders together.
    Supports wave picking strategies for efficient order fulfillment.
    """

    __tablename__ = "outbound_waves"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    wave_number = Column(String(50), nullable=False, index=True, unique=True)

    status = Column(
        SQLEnum(OutboundWaveStatus, native_enum=False, length=50),
        nullable=False,
        default=OutboundWaveStatus.PLANNING
    )

    # Strategy for allocation (nullable - can be set per wave)
    strategy_id = Column(BigInteger, ForeignKey("allocation_strategies.id"), nullable=True, index=True)

    # Metrics and metadata - stores wave type, criteria, and operational metrics
    metrics = Column(JSONB, nullable=True, default={})

    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="outbound_waves")
    strategy = relationship("AllocationStrategy", back_populates="waves", lazy="joined")
    orders = relationship(
        "OutboundOrder",
        back_populates="wave",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    pick_tasks = relationship(
        "PickTask",
        back_populates="wave",
        lazy="selectin"
    )
    created_by_user = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        {"comment": "Outbound waves for batch picking operations"}
    )
