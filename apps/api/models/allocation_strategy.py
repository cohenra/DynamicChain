from datetime import datetime
from enum import Enum
from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Text, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database import Base


class PickingType(str, Enum):
    """Type of picking strategy."""
    DISCRETE = "DISCRETE"  # Pick one order at a time
    WAVE = "WAVE"  # Pick multiple orders together
    CLUSTER = "CLUSTER"  # Pick multiple orders to different containers


class AllocationStrategy(Base):
    """
    Allocation Strategy - The Brain Configuration.
    Defines how inventory is allocated to orders and how picking is performed.
    User-configurable for maximum flexibility.
    """

    __tablename__ = "allocation_strategies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)

    picking_type = Column(
        SQLEnum(PickingType, native_enum=False, length=50),
        nullable=False,
        default=PickingType.DISCRETE
    )

    # Rules configuration - CRITICAL for allocation logic
    # Structure must support:
    # {
    #   "inventory_source": {
    #     "status_list": ["AVAILABLE", "RESERVED"],
    #     "zone_priority": ["DRY", "COOL"]
    #   },
    #   "picking_policy": "FEFO" | "LIFO" | "BEST_FIT",
    #   "partial_policy": "FILL_OR_KILL" | "ALLOW_PARTIAL",
    #   "pallet_logic": "PRIORITIZE_FULL_PALLET" | "PRIORITIZE_LOOSE",
    #   "batch_matching": true | false,
    #   "expiry_days_threshold": 30
    # }
    rules_config = Column(JSONB, nullable=False, default={})

    # Active flag
    is_active = Column(Boolean, nullable=False, default=True)

    description = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="allocation_strategies")
    waves = relationship(
        "OutboundWave",
        back_populates="strategy",
        lazy="selectin"
    )

    __table_args__ = (
        {"comment": "Allocation strategies for outbound order fulfillment"}
    )
