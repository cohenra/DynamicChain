"""add allow_over_receiving to depositors

Revision ID: 011
Revises: 010
Create Date: 2025-12-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '011'
down_revision: Union[str, None] = '010'  # Assumes 010 was the last one
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the new column with a default value of false
    op.add_column('depositors', sa.Column('allow_over_receiving', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('depositors', 'allow_over_receiving')