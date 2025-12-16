"""Add order_type_definitions table and FK to outbound_orders

Revision ID: 014
Revises: 013
Create Date: 2025-12-16

This migration:
1. Creates the order_type_definitions table for dynamic order types
2. Adds order_type_id FK to outbound_orders
3. Seeds default order types
4. Migrates existing order_type string values to order_type_id

"""
from typing import Sequence, Union
from datetime import datetime

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '014'
down_revision: Union[str, None] = '013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================
    # 1. Create order_type_definitions table
    # ============================================================
    op.create_table(
        'order_type_definitions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_priority', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('behavior_key', sa.String(length=50), nullable=False, server_default='B2B'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Add indexes
    op.create_index('ix_order_type_definitions_tenant_id', 'order_type_definitions', ['tenant_id'])
    op.create_index('ix_order_type_definitions_code', 'order_type_definitions', ['code'])
    op.create_index('ix_order_type_definitions_is_active', 'order_type_definitions', ['is_active'])

    # Add unique constraint for code per tenant
    op.create_unique_constraint(
        'uq_order_type_definitions_tenant_code',
        'order_type_definitions',
        ['tenant_id', 'code']
    )

    # ============================================================
    # 2. Add order_type_id column to outbound_orders
    # ============================================================
    op.add_column(
        'outbound_orders',
        sa.Column('order_type_id', sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        'fk_outbound_orders_order_type_id',
        'outbound_orders',
        'order_type_definitions',
        ['order_type_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_outbound_orders_order_type_id', 'outbound_orders', ['order_type_id'])

    # ============================================================
    # 3. Seed default order types for existing tenants
    # ============================================================
    connection = op.get_bind()
    now = datetime.utcnow().isoformat()

    # Get all tenant IDs
    result = connection.execute(text("SELECT id FROM tenants"))
    tenant_ids = [row[0] for row in result]

    # Default order types to seed
    default_types = [
        {"code": "SALES", "name": "Sales Order", "behavior_key": "B2B", "default_priority": 5},
        {"code": "ECOM", "name": "E-Commerce", "behavior_key": "ECOM", "default_priority": 8},
        {"code": "B2B", "name": "B2B Order", "behavior_key": "B2B", "default_priority": 5},
        {"code": "TRANSFER", "name": "Transfer", "behavior_key": "TRANSFER", "default_priority": 3},
        {"code": "RETURN", "name": "Return", "behavior_key": "RETURN", "default_priority": 2},
        {"code": "RETAIL", "name": "Retail", "behavior_key": "RETAIL", "default_priority": 5},
        {"code": "SAMPLE", "name": "Sample", "behavior_key": "B2B", "default_priority": 1},
        {"code": "CUSTOMER_ORDER", "name": "Customer Order", "behavior_key": "B2B", "default_priority": 5},
    ]

    for tenant_id in tenant_ids:
        for type_data in default_types:
            connection.execute(
                text("""
                    INSERT INTO order_type_definitions
                    (tenant_id, code, name, behavior_key, default_priority, is_active, created_at, updated_at)
                    VALUES (:tenant_id, :code, :name, :behavior_key, :default_priority, true, :now, :now)
                    ON CONFLICT (tenant_id, code) DO NOTHING
                """),
                {
                    "tenant_id": tenant_id,
                    "code": type_data["code"],
                    "name": type_data["name"],
                    "behavior_key": type_data["behavior_key"],
                    "default_priority": type_data["default_priority"],
                    "now": now
                }
            )

    # ============================================================
    # 4. Migrate existing order_type values to order_type_id
    # ============================================================
    # Update outbound_orders to reference the new order_type_definitions
    connection.execute(
        text("""
            UPDATE outbound_orders o
            SET order_type_id = otd.id
            FROM order_type_definitions otd
            WHERE otd.tenant_id = o.tenant_id
              AND UPPER(otd.code) = UPPER(o.order_type)
              AND o.order_type_id IS NULL
        """)
    )


def downgrade() -> None:
    # Remove FK and column from outbound_orders
    op.drop_constraint('fk_outbound_orders_order_type_id', 'outbound_orders', type_='foreignkey')
    op.drop_index('ix_outbound_orders_order_type_id', table_name='outbound_orders')
    op.drop_column('outbound_orders', 'order_type_id')

    # Drop order_type_definitions table
    op.drop_constraint('uq_order_type_definitions_tenant_code', 'order_type_definitions', type_='unique')
    op.drop_index('ix_order_type_definitions_is_active', table_name='order_type_definitions')
    op.drop_index('ix_order_type_definitions_code', table_name='order_type_definitions')
    op.drop_index('ix_order_type_definitions_tenant_id', table_name='order_type_definitions')
    op.drop_table('order_type_definitions')
