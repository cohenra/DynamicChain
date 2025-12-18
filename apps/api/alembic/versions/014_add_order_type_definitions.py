"""add_order_type_definitions

Revision ID: 014
Revises: 013
Create Date: 2024-12-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from datetime import datetime

# --- FIX: Use short revision IDs to match previous files ---
revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create the new table
    op.create_table('order_type_definitions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('default_priority', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('behavior_key', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'code', name='uq_order_type_tenant_code')
    )
    
    op.create_index(op.f('ix_order_type_definitions_tenant_id'), 'order_type_definitions', ['tenant_id'], unique=False)

    # 2. Add reference column to outbound_orders
    op.add_column('outbound_orders', sa.Column('order_type_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_outbound_orders_order_type_id', 'outbound_orders', 'order_type_definitions', ['order_type_id'], ['id'])

    # 3. Seed Data Logic
    bind = op.get_bind()
    
    # FIX: Use Python datetime object, NOT string
    now = datetime.utcnow()
    
    default_types = [
        {'code': 'SALES', 'name': 'Sales Order', 'behavior': 'B2B', 'priority': 5},
        {'code': 'B2B', 'name': 'B2B Order', 'behavior': 'B2B', 'priority': 5},
        {'code': 'ECOM', 'name': 'E-Commerce', 'behavior': 'ECOM', 'priority': 10},
        {'code': 'TRANSFER', 'name': 'Internal Transfer', 'behavior': 'TRANSFER', 'priority': 3},
        {'code': 'RETURN', 'name': 'Vendor Return', 'behavior': 'RETURN', 'priority': 3},
        {'code': 'RETAIL', 'name': 'Retail Replenishment', 'behavior': 'RETAIL', 'priority': 5},
        {'code': 'SAMPLE', 'name': 'Sample Request', 'behavior': 'B2B', 'priority': 8},
    ]

    # Handle tenant discovery safely
    try:
        result = bind.execute(sa.text("SELECT DISTINCT tenant_id FROM users"))
        tenant_ids = [row[0] for row in result]
    except Exception:
        tenant_ids = []
    
    if not tenant_ids:
        tenant_ids = [1]

    for tenant_id in tenant_ids:
        for dtype in default_types:
            query = sa.text("""
                INSERT INTO order_type_definitions
                (tenant_id, code, name, behavior_key, default_priority, is_active, created_at, updated_at)
                VALUES (:t_id, :code, :name, :behavior, :prio, true, :now, :now)
                ON CONFLICT (tenant_id, code) DO NOTHING
            """)
            
            bind.execute(query, {
                "t_id": tenant_id,
                "code": dtype['code'],
                "name": dtype['name'],
                "behavior": dtype['behavior'],
                "prio": dtype['priority'],
                "now": now 
            })


def downgrade() -> None:
    op.drop_constraint('fk_outbound_orders_order_type_id', 'outbound_orders', type_='foreignkey')
    op.drop_column('outbound_orders', 'order_type_id')
    op.drop_index(op.f('ix_order_type_definitions_tenant_id'), table_name='order_type_definitions')
    op.drop_table('order_type_definitions')