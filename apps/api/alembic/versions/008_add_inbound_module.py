"""Add inbound module tables

Revision ID: 008
Revises: 007
Create Date: 2025-12-04 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================
    # A. Inbound Orders Table
    # ============================================================
    op.create_table(
        'inbound_orders',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('order_number', sa.String(length=100), nullable=False),

        # Order Type & Status - Using String to avoid Enum issues
        sa.Column('order_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),

        sa.Column('supplier_name', sa.String(length=255), nullable=True),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        
        # Changed to BigInteger (No FK for now)
        sa.Column('linked_outbound_order_id', sa.BigInteger(), nullable=True),

        sa.Column('expected_delivery_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['customer_id'], ['depositors.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'order_number', name='uq_tenant_inbound_order_number')
    )

    op.create_index('ix_inbound_orders_tenant_id', 'inbound_orders', ['tenant_id'])
    op.create_index('ix_inbound_orders_order_number', 'inbound_orders', ['order_number'])
    op.create_index('ix_inbound_orders_status', 'inbound_orders', ['status'])

    # ============================================================
    # B. Inbound Lines Table
    # ============================================================
    op.create_table(
        'inbound_lines',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('inbound_order_id', sa.BigInteger(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('expected_quantity', sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column('received_quantity', sa.Numeric(precision=18, scale=6), nullable=False, server_default='0'),
        sa.Column('uom_id', sa.Integer(), nullable=False),

        sa.Column('expected_batch', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['inbound_order_id'], ['inbound_orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['uom_id'], ['uom_definitions.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('expected_quantity > 0', name='ck_inbound_line_expected_qty_positive'),
        sa.CheckConstraint('received_quantity >= 0', name='ck_inbound_line_received_qty_nonnegative')
    )

    op.create_index('ix_inbound_lines_inbound_order_id', 'inbound_lines', ['inbound_order_id'])
    op.create_index('ix_inbound_lines_product_id', 'inbound_lines', ['product_id'])

    # ============================================================
    # C. Inbound Shipments Table
    # ============================================================
    op.create_table(
        'inbound_shipments',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('inbound_order_id', sa.BigInteger(), nullable=False),
        sa.Column('shipment_number', sa.String(length=100), nullable=False),

        # Status as String
        sa.Column('status', sa.String(length=50), nullable=False, server_default='SCHEDULED'),

        # --- התיקון הקריטי: הוספת העמודה החסרה ---
        sa.Column('container_number', sa.String(length=50), nullable=True),
        
        sa.Column('driver_details', sa.Text(), nullable=True), # Changed to Text to match model usage often
        sa.Column('arrival_date', sa.DateTime(), nullable=True),
        sa.Column('closed_date', sa.DateTime(), nullable=True),

        sa.Column('notes', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['inbound_order_id'], ['inbound_orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index('ix_inbound_shipments_inbound_order_id', 'inbound_shipments', ['inbound_order_id'])
    op.create_index('ix_inbound_shipments_shipment_number', 'inbound_shipments', ['shipment_number'])

    # ============================================================
    # D. Update Inventory Transactions Table
    # ============================================================
    op.add_column('inventory_transactions', sa.Column('inbound_shipment_id', sa.BigInteger(), nullable=True))
    
    op.create_foreign_key(
        'fk_inventory_transactions_inbound_shipment',
        'inventory_transactions',
        'inbound_shipments',
        ['inbound_shipment_id'],
        ['id'],
        ondelete='SET NULL'
    )

    op.create_index(
        'ix_inventory_transactions_inbound_shipment_id',
        'inventory_transactions',
        ['inbound_shipment_id']
    )


def downgrade() -> None:
    # Drop in reverse order
    op.drop_index('ix_inventory_transactions_inbound_shipment_id', table_name='inventory_transactions')
    op.drop_constraint('fk_inventory_transactions_inbound_shipment', 'inventory_transactions', type_='foreignkey')
    op.drop_column('inventory_transactions', 'inbound_shipment_id')

    op.drop_table('inbound_shipments')
    op.drop_table('inbound_lines')
    op.drop_table('inbound_orders')