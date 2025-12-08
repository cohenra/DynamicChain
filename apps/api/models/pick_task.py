from datetime import datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import Column, BigInteger, Integer, DateTime, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base


class PickTaskStatus(str, Enum):
    """Status enum for pick tasks."""
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    SHORT = "SHORT"  # Cannot find inventory


class PickTask(Base):
    """
    Pick Task - The Execution.
    Represents a specific picking action for a warehouse operator.
    Links inventory to orders through the wave system.
    """

    __tablename__ = "pick_tasks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Wave and Order references
    wave_id = Column(BigInteger, ForeignKey("outbound_waves.id"), nullable=True, index=True)
    order_id = Column(BigInteger, ForeignKey("outbound_orders.id"), nullable=False, index=True)
    line_id = Column(BigInteger, ForeignKey("outbound_lines.id"), nullable=False, index=True)

    # The specific LPN/Inventory allocated
    inventory_id = Column(BigInteger, ForeignKey("inventory.id"), nullable=False, index=True)

    # Location details
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True, index=True)  # Staging/Packing

    # Quantities
    qty_to_pick = Column(Numeric(15, 3), nullable=False)
    qty_picked = Column(Numeric(15, 3), nullable=False, default=Decimal('0'))

    status = Column(
        SQLEnum(PickTaskStatus, native_enum=False, length=50),
        nullable=False,
        default=PickTaskStatus.PENDING,
        index=True
    )

    # Assignment
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Audit timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    assigned_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    wave = relationship("OutboundWave", back_populates="pick_tasks")
    order = relationship("OutboundOrder", back_populates="pick_tasks")
    line = relationship("OutboundLine", back_populates="pick_tasks")
    inventory = relationship("Inventory", lazy="joined")
    from_location = relationship("Location", foreign_keys=[from_location_id], lazy="joined")
    to_location = relationship("Location", foreign_keys=[to_location_id], lazy="joined")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to_user_id])

    __table_args__ = (
        {"comment": "Pick tasks for warehouse operators"}
    )
