from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.outbound_line import OutboundLine
from repositories.base_repository import BaseRepository

class OutboundLineRepository(BaseRepository[OutboundLine]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, OutboundLine)

    # כאן אנחנו צריכים get_by_id שלא תלוי ב-tenant_id (כי שורה שייכת להזמנה)
    # ולכן נדרוס או נשתמש בשאילתה ישירה, אך לטובת אחידות:
    async def get_by_id(self, id: int) -> Optional[OutboundLine]:
        # שימו לב: BaseRepository דורש tenant_id בדר"כ.
        # מכיוון ש-Lines הן ישויות ילד, נממש כאן ידנית כדי לא לסבך את ה-Base
        query = select(OutboundLine).where(OutboundLine.id == id).options(
            selectinload(OutboundLine.product),
            selectinload(OutboundLine.uom)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()