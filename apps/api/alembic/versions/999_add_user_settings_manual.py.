"""add user settings manual

Revision ID: 999
Revises: 006
Create Date: 2025-12-04 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '999'
down_revision: Union[str, None] = '006'  # שים לב: זה מתחבר למיגרציה האחרונה שהייתה לך (006)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_table_settings table
    op.create_table(
        'user_table_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('table_name', sa.String(length=100), nullable=False),
        sa.Column('settings_json', JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'table_name', name='uq_user_table_name')
    )
    op.create_index(op.f('ix_user_table_settings_id'), 'user_table_settings', ['id'], unique=False)
    op.create_index('ix_user_table_settings_user_id', 'user_table_settings', ['user_id'])
    op.create_index('ix_user_table_settings_table_name', 'user_table_settings', ['table_name'])


def downgrade() -> None:
    op.drop_index('ix_user_table_settings_table_name', table_name='user_table_settings')
    op.drop_index('ix_user_table_settings_user_id', table_name='user_table_settings')
    op.drop_index(op.f('ix_user_table_settings_id'), table_name='user_table_settings')
    op.drop_table('user_table_settings')
