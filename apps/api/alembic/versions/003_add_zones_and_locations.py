"""Add zones and locations tables

Revision ID: 003
Revises: 002
Create Date: 2025-12-03 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create zones table
    op.create_table(
        'zones',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('warehouse_id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'warehouse_id', 'code', name='uq_zone_code_per_warehouse')
    )
    op.create_index('ix_zones_tenant_id', 'zones', ['tenant_id'], unique=False)
    op.create_index('ix_zones_warehouse_id', 'zones', ['warehouse_id'], unique=False)

    # Create location type enum
    location_type_enum = sa.Enum('SHELF', 'PALLET_RACK', 'FLOOR', 'CAGED', name='location_type_enum')
    location_type_enum.create(op.get_bind())

    # Create location usage enum
    location_usage_enum = sa.Enum('PICKING', 'STORAGE', 'INBOUND', 'OUTBOUND', 'HANDOFF', 'QUARANTINE', name='location_usage_enum')
    location_usage_enum.create(op.get_bind())

    # Create locations table
    op.create_table(
        'locations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('warehouse_id', sa.Integer(), nullable=False),
        sa.Column('zone_id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('aisle', sa.String(length=50), nullable=False),
        sa.Column('bay', sa.String(length=50), nullable=False),
        sa.Column('level', sa.String(length=50), nullable=False),
        sa.Column('type', location_type_enum, nullable=False),
        sa.Column('usage', location_usage_enum, nullable=False),
        sa.Column('pick_sequence', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'warehouse_id', 'name', name='uq_location_name_per_warehouse')
    )
    op.create_index('ix_locations_tenant_id', 'locations', ['tenant_id'], unique=False)
    op.create_index('ix_locations_warehouse_id', 'locations', ['warehouse_id'], unique=False)
    op.create_index('ix_locations_zone_id', 'locations', ['zone_id'], unique=False)
    op.create_index('ix_locations_usage', 'locations', ['usage'], unique=False)


def downgrade() -> None:
    # Drop locations table
    op.drop_index('ix_locations_usage', table_name='locations')
    op.drop_index('ix_locations_zone_id', table_name='locations')
    op.drop_index('ix_locations_warehouse_id', table_name='locations')
    op.drop_index('ix_locations_tenant_id', table_name='locations')
    op.drop_table('locations')

    # Drop location enums
    sa.Enum(name='location_usage_enum').drop(op.get_bind())
    sa.Enum(name='location_type_enum').drop(op.get_bind())

    # Drop zones table
    op.drop_index('ix_zones_warehouse_id', table_name='zones')
    op.drop_index('ix_zones_tenant_id', table_name='zones')
    op.drop_table('zones')
