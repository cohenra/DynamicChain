from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.zone import ZoneCreate, ZoneUpdate, ZoneResponse
from services.zone_service import ZoneService
from auth.dependencies import get_current_user
from models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/api/zones", tags=["Zones"])

# 1. סכמה חדשה לתגובה עם פגינציה
class PaginatedZoneResponse(BaseModel):
    items: List[ZoneResponse]
    total: int

@router.post("/", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(
    zone_data: ZoneCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ZoneResponse:
    zone_service = ZoneService(db)
    zone = await zone_service.create_zone(
        zone_data=zone_data,
        tenant_id=current_user.tenant_id
    )
    return ZoneResponse.model_validate(zone)

@router.get("/", response_model=PaginatedZoneResponse) # 2. שינוי סוג ההחזרה
async def list_zones(
    warehouse_id: Optional[int] = Query(None, description="Filter by warehouse ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=1000, description="Maximum number of records to return"), # ברירת מחדל נמוכה יותר למהירות
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaginatedZoneResponse:
    zone_service = ZoneService(db)
    
    # שליפת הנתונים (העמוד הנוכחי)
    zones = await zone_service.list_zones(
        tenant_id=current_user.tenant_id,
        warehouse_id=warehouse_id,
        skip=skip,
        limit=limit
    )
    
    # שליפת סך הכל רשומות (עבור הטבלה)
    total_count = await zone_service.count_zones(
        tenant_id=current_user.tenant_id,
        warehouse_id=warehouse_id
    )
    
    return PaginatedZoneResponse(
        items=[ZoneResponse.model_validate(zone) for zone in zones],
        total=total_count
    )

@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone(
    zone_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ZoneResponse:
    zone_service = ZoneService(db)
    zone = await zone_service.get_zone(
        zone_id=zone_id,
        tenant_id=current_user.tenant_id
    )
    return ZoneResponse.model_validate(zone)

@router.patch("/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: int,
    zone_data: ZoneUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ZoneResponse:
    zone_service = ZoneService(db)
    zone = await zone_service.update_zone(
        zone_id=zone_id,
        zone_data=zone_data,
        tenant_id=current_user.tenant_id
    )
    return ZoneResponse.model_validate(zone)

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(
    zone_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    zone_service = ZoneService(db)
    await zone_service.delete_zone(
        zone_id=zone_id,
        tenant_id=current_user.tenant_id
    )