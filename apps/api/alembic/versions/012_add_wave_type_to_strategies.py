"""add wave_type to allocation_strategies

Revision ID: 012
Revises: 011
Create Date: 2025-12-13 20:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '012'
down_revision: Union[str, None] = '011'  # Assumes 011 was the last one
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add the column
    op.add_column('allocation_strategies', sa.Column('wave_type', sa.String(length=50), nullable=True))
    
    # 2. Add the index
    op.create_index(op.f('ix_allocation_strategies_wave_type'), 'allocation_strategies', ['wave_type'], unique=False)
    
    # 3. Add the unique constraint (tenant_id + wave_type)
    op.create_unique_constraint('uq_strategy_wave_type_per_tenant', 'allocation_strategies', ['tenant_id', 'wave_type'])


def downgrade() -> None:
    op.drop_constraint('uq_strategy_wave_type_per_tenant', 'allocation_strategies', type_='unique')
    op.drop_index(op.f('ix_allocation_strategies_wave_type'), table_name='allocation_strategies')
    op.drop_column('allocation_strategies', 'wave_type')