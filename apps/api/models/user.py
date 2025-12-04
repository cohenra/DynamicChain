from datetime import datetime
from enum import Enum
from sqlalchemy import String, Integer, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    PICKER = "picker"
    VIEWER = "viewer"


class User(Base):
    """User model with multi-tenant support."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole),
        nullable=False,
        default=UserRole.VIEWER
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
    table_settings: Mapped[list["UserTableSetting"]] = relationship(
        "UserTableSetting",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    inventory_transactions: Mapped[list["InventoryTransaction"]] = relationship(
        "InventoryTransaction",
        back_populates="performed_by_user",
        cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["SystemAuditLog"]] = relationship(
        "SystemAuditLog",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
