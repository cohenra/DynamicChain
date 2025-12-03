from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from models.location import LocationType, LocationUsage


class LocationBase(BaseModel):
    """Base schema for Location with common fields."""
    name: str = Field(..., min_length=1, max_length=100, description="Location barcode name (e.g., 'A-01-01-01')")
    aisle: str = Field(..., min_length=1, max_length=50, description="Aisle identifier (e.g., 'A')")
    bay: str = Field(..., min_length=1, max_length=50, description="Bay identifier (e.g., '01')")
    level: str = Field(..., min_length=1, max_length=50, description="Level identifier (e.g., '01')")
    slot: str = Field(..., min_length=1, max_length=50, description="Slot/Bin identifier (e.g., '01')")
    type_id: int = Field(..., description="ID of the location type definition")
    usage_id: int = Field(..., description="ID of the location usage definition")
    pick_sequence: int = Field(default=0, description="Pick sequence for walk path sorting")


class LocationCreate(LocationBase):
    """Schema for creating a new location."""
    warehouse_id: int = Field(..., description="ID of the warehouse this location belongs to")
    zone_id: int = Field(..., description="ID of the zone this location belongs to")


class LocationUpdate(BaseModel):
    """Schema for updating an existing location."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    aisle: Optional[str] = Field(None, min_length=1, max_length=50)
    bay: Optional[str] = Field(None, min_length=1, max_length=50)
    level: Optional[str] = Field(None, min_length=1, max_length=50)
    slot: Optional[str] = Field(None, min_length=1, max_length=50)
    type_id: Optional[int] = None
    usage_id: Optional[int] = None
    pick_sequence: Optional[int] = None


class LocationResponse(LocationBase):
    """Schema for location response."""
    id: int
    warehouse_id: int
    zone_id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LocationWithZone(LocationResponse):
    """Schema for location response with zone details."""
    zone_name: Optional[str] = None
    zone_code: Optional[str] = None


class LocationBulkCreateConfig(BaseModel):
    """Schema for bulk location generation configuration."""
    warehouse_id: int = Field(..., description="ID of the warehouse")
    zone_id: int = Field(..., description="ID of the zone")
    aisle: str = Field(..., min_length=1, max_length=50, description="Aisle identifier")
    bay_start: int = Field(..., ge=1, description="Starting bay number")
    bay_end: int = Field(..., ge=1, description="Ending bay number")
    level_start: int = Field(..., ge=1, description="Starting level number")
    level_end: int = Field(..., ge=1, description="Ending level number")
    slot_start: int = Field(..., ge=1, description="Starting slot number")
    slot_end: int = Field(..., ge=1, description="Ending slot number")
    type_id: int = Field(..., description="ID of the location type definition for all generated locations")
    usage_id: int = Field(..., description="ID of the location usage definition for all generated locations")
    pick_sequence_start: int = Field(default=0, description="Starting pick sequence number")
    picking_strategy: str = Field(default="ASCENDING", description="Pick sequence generation strategy (ASCENDING, SNAKE_ODD_EVEN)")


class LocationBulkCreateResponse(BaseModel):
    """Schema for bulk location creation response."""
    created_count: int = Field(..., description="Number of locations successfully created")
    locations: List[LocationResponse] = Field(..., description="List of created locations")
