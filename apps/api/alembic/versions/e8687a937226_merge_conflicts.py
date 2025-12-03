"""merge conflicts

Revision ID: e8687a937226
Revises: 002, cd200a0ee108
Create Date: 2025-12-03 12:29:34.551916

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8687a937226'
down_revision: Union[str, None] = ('002', 'cd200a0ee108')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
