from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class UserTableSetting(Base):
    """User Table Setting - Stores user-specific table preferences (column order, visibility, pagination)."""

    __tablename__ = "user_table_settings"

    # Table constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'table_name', name='uq_user_table_name'),
        Index('ix_user_table_settings_user_id', 'user_id'),
        Index('ix_user_table_settings_table_name', 'table_name'),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    settings_json: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict
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
    user: Mapped["User"] = relationship("User", back_populates="table_settings")

    def __repr__(self) -> str:
        return f"<UserTableSetting(id={self.id}, user_id={self.user_id}, table_name='{self.table_name}')>"
