"""Add UOM definitions and refactor product UOMs

Revision ID: 002
Revises: 001
Create Date: 2025-12-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create uom_definitions table
    op.create_table(
        'uom_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'code', name='uq_tenant_uom_code')
    )
    op.create_index(op.f('ix_uom_definitions_id'), 'uom_definitions', ['id'], unique=False)
    op.create_index(op.f('ix_uom_definitions_tenant_id'), 'uom_definitions', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_uom_definitions_code'), 'uom_definitions', ['code'], unique=False)

    # Update products table: replace base_unit with base_uom_id
    # Add base_uom_id column
    op.add_column('products', sa.Column('base_uom_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_products_base_uom_id', 'products', 'uom_definitions', ['base_uom_id'], ['id'], ondelete='SET NULL')

    # Drop base_unit column
    op.drop_column('products', 'base_unit')

    # Update product_uoms table: replace uom_name with uom_id
    # First, drop the unique constraint on (product_id, uom_name)
    op.drop_constraint('uq_product_uom_name', 'product_uoms', type_='unique')

    # Add uom_id column
    op.add_column('product_uoms', sa.Column('uom_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_product_uoms_uom_id', 'product_uoms', 'uom_definitions', ['uom_id'], ['id'], ondelete='CASCADE')

    # Drop uom_name column
    op.drop_column('product_uoms', 'uom_name')

    # Make uom_id not nullable (after data migration if needed)
    op.alter_column('product_uoms', 'uom_id', nullable=False)

    # Add new unique constraint on (product_id, uom_id)
    op.create_unique_constraint('uq_product_uom_id', 'product_uoms', ['product_id', 'uom_id'])


def downgrade() -> None:
    # Reverse product_uoms changes
    op.drop_constraint('uq_product_uom_id', 'product_uoms', type_='unique')
    op.add_column('product_uoms', sa.Column('uom_name', sa.String(length=100), nullable=False))
    op.drop_constraint('fk_product_uoms_uom_id', 'product_uoms', type_='foreignkey')
    op.drop_column('product_uoms', 'uom_id')
    op.create_unique_constraint('uq_product_uom_name', 'product_uoms', ['product_id', 'uom_name'])

    # Reverse products changes
    op.add_column('products', sa.Column('base_unit', sa.String(length=50), nullable=True))
    op.drop_constraint('fk_products_base_uom_id', 'products', type_='foreignkey')
    op.drop_column('products', 'base_uom_id')

    # Drop uom_definitions table
    op.drop_index(op.f('ix_uom_definitions_code'), table_name='uom_definitions')
    op.drop_index(op.f('ix_uom_definitions_tenant_id'), table_name='uom_definitions')
    op.drop_index(op.f('ix_uom_definitions_id'), table_name='uom_definitions')
    op.drop_table('uom_definitions')
