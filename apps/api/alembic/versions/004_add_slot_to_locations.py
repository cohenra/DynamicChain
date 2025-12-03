"""Add slot column to locations and update unique constraint

Revision ID: 004
Revises: 003
Create Date: 2025-12-03 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add slot column to locations table
    op.add_column('locations', sa.Column('slot', sa.String(length=50), nullable=True))

    # For existing rows, set a default slot value (e.g., "01")
    # This is temporary to allow the NOT NULL constraint
    op.execute("UPDATE locations SET slot = '01' WHERE slot IS NULL")

    # Now make the column NOT NULL
    op.alter_column('locations', 'slot', nullable=False)

    # Drop the old unique constraint
    op.drop_constraint('uq_location_name_per_warehouse', 'locations', type_='unique')

    # Create new unique constraint without tenant_id
    op.create_unique_constraint('uq_location_name_per_warehouse', 'locations', ['warehouse_id', 'name'])


def downgrade() -> None:
    # Drop the new unique constraint
    op.drop_constraint('uq_location_name_per_warehouse', 'locations', type_='unique')

    # Recreate the old unique constraint with tenant_id
    op.create_unique_constraint('uq_location_name_per_warehouse', 'locations', ['tenant_id', 'warehouse_id', 'name'])

    # Drop the slot column
    op.drop_column('locations', 'slot')
