"""Add outbound module schema

Revision ID: 009
Revises: 008
Create Date: 2025-12-08 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '009'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================
    # A. Allocation Strategies Table
    # ============================================================
    op.create_table(
        'allocation_strategies',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),

        # Picking Type - Using String to avoid Enum issues
        sa.Column('picking_type', sa.String(length=50), nullable=False, server_default='DISCRETE'),

        # Rules configuration stored as JSONB for flexibility
        sa.Column('rules_config', JSONB, nullable=False, server_default='{}'),

        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('description', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index('ix_allocation_strategies_tenant_id', 'allocation_strategies', ['tenant_id'])

    # ============================================================
    # B. Outbound Waves Table
    # ============================================================
    op.create_table(
        'outbound_waves',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('wave_number', sa.String(length=50), nullable=False),

        # Status - Using String to avoid Enum issues
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PLANNING'),

        # Strategy FK
        sa.Column('strategy_id', sa.BigInteger(), nullable=True),

        # Audit fields
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['strategy_id'], ['allocation_strategies.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('wave_number', name='uq_wave_number')
    )

    op.create_index('ix_outbound_waves_tenant_id', 'outbound_waves', ['tenant_id'])
    op.create_index('ix_outbound_waves_wave_number', 'outbound_waves', ['wave_number'])
    op.create_index('ix_outbound_waves_strategy_id', 'outbound_waves', ['strategy_id'])

    # ============================================================
    # C. Outbound Orders Table
    # ============================================================
    op.create_table(
        'outbound_orders',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('order_number', sa.String(length=50), nullable=False),

        # Customer (Depositor)
        sa.Column('customer_id', sa.Integer(), nullable=False),

        # Wave association (nullable)
        sa.Column('wave_id', sa.BigInteger(), nullable=True),

        # Status - Using String to avoid Enum issues
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),

        # Order type and priority
        sa.Column('order_type', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='5'),

        # Important dates for SLA billing
        sa.Column('requested_delivery_date', sa.Date(), nullable=True),
        sa.Column('status_changed_at', sa.DateTime(), nullable=True),

        # JSONB fields for flexibility
        sa.Column('shipping_details', JSONB, nullable=True),
        sa.Column('metrics', JSONB, nullable=True, server_default='{}'),

        sa.Column('notes', sa.Text(), nullable=True),

        # Audit fields
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['customer_id'], ['depositors.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['wave_id'], ['outbound_waves.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_number', name='uq_order_number')
    )

    op.create_index('ix_outbound_orders_tenant_id', 'outbound_orders', ['tenant_id'])
    op.create_index('ix_outbound_orders_order_number', 'outbound_orders', ['order_number'])
    op.create_index('ix_outbound_orders_customer_id', 'outbound_orders', ['customer_id'])
    op.create_index('ix_outbound_orders_wave_id', 'outbound_orders', ['wave_id'])
    op.create_index('ix_outbound_orders_status', 'outbound_orders', ['status'])
    op.create_index('ix_outbound_orders_order_type', 'outbound_orders', ['order_type'])

    # ============================================================
    # D. Outbound Lines Table
    # ============================================================
    op.create_table(
        'outbound_lines',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('order_id', sa.BigInteger(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('uom_id', sa.Integer(), nullable=False),

        # Quantities through the lifecycle
        sa.Column('qty_ordered', sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column('qty_allocated', sa.Numeric(precision=15, scale=3), nullable=False, server_default='0'),
        sa.Column('qty_picked', sa.Numeric(precision=15, scale=3), nullable=False, server_default='0'),
        sa.Column('qty_packed', sa.Numeric(precision=15, scale=3), nullable=False, server_default='0'),
        sa.Column('qty_shipped', sa.Numeric(precision=15, scale=3), nullable=False, server_default='0'),

        # Allocation constraints stored as JSONB
        sa.Column('constraints', JSONB, nullable=True, server_default='{}'),

        # Line-level status
        sa.Column('line_status', sa.String(length=50), nullable=True),

        sa.Column('notes', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['order_id'], ['outbound_orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['uom_id'], ['uom_definitions.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('qty_ordered > 0', name='ck_outbound_line_qty_ordered_positive'),
        sa.CheckConstraint('qty_allocated >= 0', name='ck_outbound_line_qty_allocated_nonnegative'),
        sa.CheckConstraint('qty_picked >= 0', name='ck_outbound_line_qty_picked_nonnegative'),
        sa.CheckConstraint('qty_packed >= 0', name='ck_outbound_line_qty_packed_nonnegative'),
        sa.CheckConstraint('qty_shipped >= 0', name='ck_outbound_line_qty_shipped_nonnegative')
    )

    op.create_index('ix_outbound_lines_order_id', 'outbound_lines', ['order_id'])
    op.create_index('ix_outbound_lines_product_id', 'outbound_lines', ['product_id'])
    op.create_index('ix_outbound_lines_line_status', 'outbound_lines', ['line_status'])

    # ============================================================
    # E. Pick Tasks Table
    # ============================================================
    op.create_table(
        'pick_tasks',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),

        # Wave and Order references
        sa.Column('wave_id', sa.BigInteger(), nullable=True),
        sa.Column('order_id', sa.BigInteger(), nullable=False),
        sa.Column('line_id', sa.BigInteger(), nullable=False),

        # The specific LPN/Inventory allocated
        sa.Column('inventory_id', sa.BigInteger(), nullable=False),

        # Location details
        sa.Column('from_location_id', sa.Integer(), nullable=False),
        sa.Column('to_location_id', sa.Integer(), nullable=True),

        # Quantities
        sa.Column('qty_to_pick', sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column('qty_picked', sa.Numeric(precision=15, scale=3), nullable=False, server_default='0'),

        # Status - Using String to avoid Enum issues
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),

        # Assignment
        sa.Column('assigned_to_user_id', sa.Integer(), nullable=True),

        # Audit timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),

        sa.ForeignKeyConstraint(['wave_id'], ['outbound_waves.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['order_id'], ['outbound_orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['line_id'], ['outbound_lines.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['inventory_id'], ['inventory.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['from_location_id'], ['locations.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['to_location_id'], ['locations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_to_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('qty_to_pick > 0', name='ck_pick_task_qty_to_pick_positive'),
        sa.CheckConstraint('qty_picked >= 0', name='ck_pick_task_qty_picked_nonnegative')
    )

    op.create_index('ix_pick_tasks_wave_id', 'pick_tasks', ['wave_id'])
    op.create_index('ix_pick_tasks_order_id', 'pick_tasks', ['order_id'])
    op.create_index('ix_pick_tasks_line_id', 'pick_tasks', ['line_id'])
    op.create_index('ix_pick_tasks_inventory_id', 'pick_tasks', ['inventory_id'])
    op.create_index('ix_pick_tasks_from_location_id', 'pick_tasks', ['from_location_id'])
    op.create_index('ix_pick_tasks_to_location_id', 'pick_tasks', ['to_location_id'])
    op.create_index('ix_pick_tasks_status', 'pick_tasks', ['status'])
    op.create_index('ix_pick_tasks_assigned_to_user_id', 'pick_tasks', ['assigned_to_user_id'])


def downgrade() -> None:
    # Drop in reverse order
    op.drop_table('pick_tasks')
    op.drop_table('outbound_lines')
    op.drop_table('outbound_orders')
    op.drop_table('outbound_waves')
    op.drop_table('allocation_strategies')
