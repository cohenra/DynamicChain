from datetime import datetime
from typing import Dict, Any
from sqlalchemy import String, Integer, BigInteger, ForeignKey, DateTime, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class SystemAuditLog(Base):
    """
    System Audit Log model - Administrative action tracking.

    Tracks non-inventory configuration changes (users, products, warehouses, etc.).
    Stores field-level changes in JSONB format: {"field": {"old": "A", "new": "B"}}
    """

    __tablename__ = "system_audit_logs"

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            "action IN ('CREATE', 'UPDATE', 'DELETE')",
            name='ck_audit_action_valid'
        ),
        Index('ix_system_audit_logs_tenant_id', 'tenant_id'),
        Index('ix_system_audit_logs_user_id', 'user_id'),
        Index('ix_system_audit_logs_entity_type', 'entity_type'),
        Index('ix_system_audit_logs_entity_id', 'entity_id'),
        Index('ix_system_audit_logs_action', 'action'),
        Index('ix_system_audit_logs_timestamp', 'timestamp'),
        # Composite indexes for common queries
        Index('ix_system_audit_logs_entity', 'entity_type', 'entity_id'),
        Index('ix_system_audit_logs_tenant_timestamp', 'tenant_id', 'timestamp'),
    )

    # Primary Key - BigInteger for unlimited audit history
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)

    # Foreign Keys
    tenant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    # Core Fields
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)

    # Change Tracking - JSONB format: {"field": {"old": "value", "new": "value"}}
    changes: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}"
    )

    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="audit_logs")
    user: Mapped["User"] = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<SystemAuditLog(id={self.id}, entity_type='{self.entity_type}', entity_id={self.entity_id}, action='{self.action}')>"
