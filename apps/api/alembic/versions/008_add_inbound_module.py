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
    # A. Inbound Orders Table (The Plan)
    # ============================================================
    op.create_table(
        'inbound_orders',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('order_number', sa.String(length=100), nullable=False),

        # Order Type: PURCHASE_ORDER, ASN, CUSTOMER_RETURN, TRANSFER_IN
        sa.Column('order_type', sa.String(length=50), nullable=False),

        # Status: DRAFT, CONFIRMED, PARTIALLY_RECEIVED, COMPLETED, CANCELLED
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),

        # Optional fields based on order type
        sa.Column('supplier_name', sa.String(length=255), nullable=True),
        sa.Column('customer_id', sa.Integer(), nullable=True),  # FK to depositors for returns
        sa.Column('linked_outbound_order_id', sa.Integer(), nullable=True),  # For return validation

        sa.Column('expected_delivery_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['customer_id'], ['depositors.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'order_number', name='uq_tenant_inbound_order_number')
    )

    # Indexes for inbound_orders
    op.create_index('ix_inbound_orders_tenant_id', 'inbound_orders', ['tenant_id'])
    op.create_index('ix_inbound_orders_order_number', 'inbound_orders', ['order_number'])
    op.create_index('ix_inbound_orders_status', 'inbound_orders', ['status'])
    op.create_index('ix_inbound_orders_order_type', 'inbound_orders', ['order_type'])
    op.create_index('ix_inbound_orders_expected_delivery', 'inbound_orders', ['expected_delivery_date'])

    # ============================================================
    # B. Inbound Lines Table (The Items)
    # ============================================================
    op.create_table(
        'inbound_lines',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('inbound_order_id', sa.BigInteger(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('expected_quantity', sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column('received_quantity', sa.Numeric(precision=18, scale=6), nullable=False, server_default='0'),
        sa.Column('uom_id', sa.Integer(), nullable=False),

        # Optional tracking fields
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

    # Indexes for inbound_lines
    op.create_index('ix_inbound_lines_inbound_order_id', 'inbound_lines', ['inbound_order_id'])
    op.create_index('ix_inbound_lines_product_id', 'inbound_lines', ['product_id'])

    # ============================================================
    # C. Inbound Shipments Table (The Physical Arrival / Container)
    # ============================================================
    op.create_table(
        'inbound_shipments',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('inbound_order_id', sa.BigInteger(), nullable=False),
        sa.Column('shipment_number', sa.String(length=100), nullable=False),

        # Status: SCHEDULED, ARRIVED, RECEIVING, CLOSED
        sa.Column('status', sa.String(length=50), nullable=False, server_default='SCHEDULED'),

        # Driver and logistics details
        sa.Column('driver_details', JSONB, nullable=True),
        sa.Column('arrival_date', sa.DateTime(), nullable=True),
        sa.Column('closed_date', sa.DateTime(), nullable=True),

        sa.Column('notes', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['inbound_order_id'], ['inbound_orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Indexes for inbound_shipments
    op.create_index('ix_inbound_shipments_inbound_order_id', 'inbound_shipments', ['inbound_order_id'])
    op.create_index('ix_inbound_shipments_shipment_number', 'inbound_shipments', ['shipment_number'])
    op.create_index('ix_inbound_shipments_status', 'inbound_shipments', ['status'])
    op.create_index('ix_inbound_shipments_arrival_date', 'inbound_shipments', ['arrival_date'])

    # ============================================================
    # D. Update Inventory Transactions Table
    # ============================================================
    # Add inbound_shipment_id column to link transactions to specific containers
    op.add_column(
        'inventory_transactions',
        sa.Column('inbound_shipment_id', sa.BigInteger(), nullable=True)
    )

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_inventory_transactions_inbound_shipment',
        'inventory_transactions',
        'inbound_shipments',
        ['inbound_shipment_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Add index for performance
    op.create_index(
        'ix_inventory_transactions_inbound_shipment_id',
        'inventory_transactions',
        ['inbound_shipment_id']
    )


def downgrade() -> None:
    # Remove the added column and constraints from inventory_transactions
    op.drop_index('ix_inventory_transactions_inbound_shipment_id', table_name='inventory_transactions')
    op.drop_constraint('fk_inventory_transactions_inbound_shipment', 'inventory_transactions', type_='foreignkey')
    op.drop_column('inventory_transactions', 'inbound_shipment_id')

    # Drop inbound module tables (in reverse order of creation)
    op.drop_index('ix_inbound_shipments_arrival_date', table_name='inbound_shipments')
    op.drop_index('ix_inbound_shipments_status', table_name='inbound_shipments')
    op.drop_index('ix_inbound_shipments_shipment_number', table_name='inbound_shipments')
    op.drop_index('ix_inbound_shipments_inbound_order_id', table_name='inbound_shipments')
    op.drop_table('inbound_shipments')

    op.drop_index('ix_inbound_lines_product_id', table_name='inbound_lines')
    op.drop_index('ix_inbound_lines_inbound_order_id', table_name='inbound_lines')
    op.drop_table('inbound_lines')

    op.drop_index('ix_inbound_orders_expected_delivery', table_name='inbound_orders')
    op.drop_index('ix_inbound_orders_order_type', table_name='inbound_orders')
    op.drop_index('ix_inbound_orders_status', table_name='inbound_orders')
    op.drop_index('ix_inbound_orders_order_number', table_name='inbound_orders')
    op.drop_index('ix_inbound_orders_tenant_id', table_name='inbound_orders')
    op.drop_table('inbound_orders')
