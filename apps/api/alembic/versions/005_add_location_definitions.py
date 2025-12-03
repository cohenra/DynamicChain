"""Add location type and usage definitions

Revision ID: 005
Revises: 004
Create Date: 2025-12-03 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create location_type_definitions table
    op.create_table(
        'location_type_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'code', name='uq_tenant_location_type_code')
    )
    op.create_index(op.f('ix_location_type_definitions_id'), 'location_type_definitions', ['id'], unique=False)
    op.create_index('ix_location_type_definitions_tenant_id', 'location_type_definitions', ['tenant_id'])
    op.create_index('ix_location_type_definitions_code', 'location_type_definitions', ['code'])

    # Create location_usage_definitions table
    op.create_table(
        'location_usage_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'code', name='uq_tenant_location_usage_code')
    )
    op.create_index(op.f('ix_location_usage_definitions_id'), 'location_usage_definitions', ['id'], unique=False)
    op.create_index('ix_location_usage_definitions_tenant_id', 'location_usage_definitions', ['tenant_id'])
    op.create_index('ix_location_usage_definitions_code', 'location_usage_definitions', ['code'])

    # Seed default location type definitions for each tenant
    conn = op.get_bind()
    tenants_result = conn.execute(text("SELECT id FROM tenants"))
    tenant_ids = [row[0] for row in tenants_result]

    # Default location types
    location_types = [
        {'code': 'SHELF', 'name': 'Shelf'},
        {'code': 'PALLET_RACK', 'name': 'Pallet Rack'},
        {'code': 'FLOOR', 'name': 'Floor'},
        {'code': 'CAGED', 'name': 'Caged'},
    ]

    # Default location usages
    location_usages = [
        {'code': 'PICKING', 'name': 'Picking'},
        {'code': 'STORAGE', 'name': 'Storage'},
        {'code': 'INBOUND', 'name': 'Inbound'},
        {'code': 'OUTBOUND', 'name': 'Outbound'},
        {'code': 'HANDOFF', 'name': 'Handoff'},
        {'code': 'QUARANTINE', 'name': 'Quarantine'},
    ]

    # Insert default definitions for each tenant
    for tenant_id in tenant_ids:
        for loc_type in location_types:
            conn.execute(
                text("""
                    INSERT INTO location_type_definitions (tenant_id, code, name, created_at, updated_at)
                    VALUES (:tenant_id, :code, :name, NOW(), NOW())
                """),
                {'tenant_id': tenant_id, 'code': loc_type['code'], 'name': loc_type['name']}
            )

        for loc_usage in location_usages:
            conn.execute(
                text("""
                    INSERT INTO location_usage_definitions (tenant_id, code, name, created_at, updated_at)
                    VALUES (:tenant_id, :code, :name, NOW(), NOW())
                """),
                {'tenant_id': tenant_id, 'code': loc_usage['code'], 'name': loc_usage['name']}
            )

    # Add new foreign key columns to locations table
    op.add_column('locations', sa.Column('type_id', sa.Integer(), nullable=True))
    op.add_column('locations', sa.Column('usage_id', sa.Integer(), nullable=True))

    # Migrate existing location data from enum to FK
    # For each location, find the matching definition ID and update the FK
    for tenant_id in tenant_ids:
        # Migrate types
        for loc_type in location_types:
            conn.execute(
                text("""
                    UPDATE locations
                    SET type_id = (
                        SELECT id FROM location_type_definitions
                        WHERE tenant_id = :tenant_id AND code = :code
                        LIMIT 1
                    )
                    WHERE tenant_id = :tenant_id AND type = :code
                """),
                {'tenant_id': tenant_id, 'code': loc_type['code']}
            )

        # Migrate usages
        for loc_usage in location_usages:
            conn.execute(
                text("""
                    UPDATE locations
                    SET usage_id = (
                        SELECT id FROM location_usage_definitions
                        WHERE tenant_id = :tenant_id AND code = :code
                        LIMIT 1
                    )
                    WHERE tenant_id = :tenant_id AND usage = :code
                """),
                {'tenant_id': tenant_id, 'code': loc_usage['code']}
            )

    # Make the new columns non-nullable
    op.alter_column('locations', 'type_id', nullable=False)
    op.alter_column('locations', 'usage_id', nullable=False)

    # Add foreign key constraints
    op.create_foreign_key(
        'fk_locations_type_id',
        'locations',
        'location_type_definitions',
        ['type_id'],
        ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_locations_usage_id',
        'locations',
        'location_usage_definitions',
        ['usage_id'],
        ['id'],
        ondelete='RESTRICT'
    )

    # Create indexes
    op.create_index('ix_locations_type_id', 'locations', ['type_id'])
    op.create_index('ix_locations_usage_id', 'locations', ['usage_id'])

    # Drop old enum columns and index
    op.drop_index('ix_locations_usage', table_name='locations')
    op.drop_column('locations', 'type')
    op.drop_column('locations', 'usage')


def downgrade() -> None:
    # Add back enum columns
    op.add_column('locations', sa.Column('type', sa.String(length=50), nullable=True))
    op.add_column('locations', sa.Column('usage', sa.String(length=50), nullable=True))

    # Migrate data back from FK to enum
    conn = op.get_bind()

    # Migrate types back
    conn.execute(
        text("""
            UPDATE locations l
            SET type = (
                SELECT code FROM location_type_definitions
                WHERE id = l.type_id
            )
        """)
    )

    # Migrate usages back
    conn.execute(
        text("""
            UPDATE locations l
            SET usage = (
                SELECT code FROM location_usage_definitions
                WHERE id = l.usage_id
            )
        """)
    )

    # Make columns non-nullable
    op.alter_column('locations', 'type', nullable=False)
    op.alter_column('locations', 'usage', nullable=False)

    # Recreate usage index
    op.create_index('ix_locations_usage', 'locations', ['usage'])

    # Drop new columns and constraints
    op.drop_index('ix_locations_usage_id', table_name='locations')
    op.drop_index('ix_locations_type_id', table_name='locations')
    op.drop_constraint('fk_locations_usage_id', 'locations', type_='foreignkey')
    op.drop_constraint('fk_locations_type_id', 'locations', type_='foreignkey')
    op.drop_column('locations', 'usage_id')
    op.drop_column('locations', 'type_id')

    # Drop definition tables
    op.drop_index('ix_location_usage_definitions_code', table_name='location_usage_definitions')
    op.drop_index('ix_location_usage_definitions_tenant_id', table_name='location_usage_definitions')
    op.drop_index(op.f('ix_location_usage_definitions_id'), table_name='location_usage_definitions')
    op.drop_table('location_usage_definitions')

    op.drop_index('ix_location_type_definitions_code', table_name='location_type_definitions')
    op.drop_index('ix_location_type_definitions_tenant_id', table_name='location_type_definitions')
    op.drop_index(op.f('ix_location_type_definitions_id'), table_name='location_type_definitions')
    op.drop_table('location_type_definitions')
