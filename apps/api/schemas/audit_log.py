from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class SystemAuditLogResponse(BaseModel):
    """Schema for system audit log response."""
    id: int
    tenant_id: int
    user_id: int
    entity_type: str
    entity_id: int
    action: str
    changes: Dict[str, Any]
    timestamp: datetime

    # Populated fields
    user_email: Optional[str] = Field(None, description="Email of user who performed the action")
    user_name: Optional[str] = Field(None, description="Name of user who performed the action")

    class Config:
        from_attributes = True


class SystemAuditLogListResponse(BaseModel):
    """Schema for paginated audit log list."""
    items: list[SystemAuditLogResponse]
    total: int
    skip: int
    limit: int
