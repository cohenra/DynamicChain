"""add metrics to outbound_waves

Revision ID: 013
Revises: 012
Create Date: 2025-12-13 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '013'
down_revision: Union[str, None] = '012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the metrics column to outbound_waves
    op.add_column('outbound_waves', sa.Column('metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'))


def downgrade() -> None:
    op.drop_column('outbound_waves', 'metrics')