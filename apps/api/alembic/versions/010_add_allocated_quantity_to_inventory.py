"""Add allocated_quantity to inventory

Revision ID: 010
Revises: 009
Create Date: 2025-12-08 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import NUMERIC

# revision identifiers, used by Alembic.
revision: str = '010'
down_revision: Union[str, None] = '009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add allocated_quantity column to inventory table
    op.add_column(
        'inventory',
        sa.Column(
            'allocated_quantity',
            NUMERIC(precision=18, scale=6),
            nullable=False,
            server_default='0'
        )
    )

    # Add check constraints
    op.create_check_constraint(
        'ck_inventory_allocated_quantity_nonnegative',
        'inventory',
        'allocated_quantity >= 0'
    )

    op.create_check_constraint(
        'ck_inventory_allocated_not_exceed_quantity',
        'inventory',
        'allocated_quantity <= quantity'
    )


def downgrade() -> None:
    # Drop check constraints
    op.drop_constraint('ck_inventory_allocated_not_exceed_quantity', 'inventory', type_='check')
    op.drop_constraint('ck_inventory_allocated_quantity_nonnegative', 'inventory', type_='check')

    # Drop column
    op.drop_column('inventory', 'allocated_quantity')
