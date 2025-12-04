"""Add inventory core and system audit tables

Revision ID: 007
Revises: 475da3ba7410
Create Date: 2025-12-04 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '007'
down_revision: Union[str, None] = '475da3ba7410' # לוודא שזה מצביע על המיגרציה הראשית שלך
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Create inventory status enum (Safe Check)
    # בודק אם הסוג קיים לפני יצירה כדי למנוע שגיאות
    result = bind.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'inventory_status_enum'"))
    if not result.scalar():
        inventory_status_enum = sa.Enum(
            'AVAILABLE',
            'RESERVED',
            'QUARANTINE',
            'DAMAGED',
            'MISSING',
            name='inventory_status_enum'
        )
        inventory_status_enum.create(bind)

    # 2. Create transaction type enum (Safe Check)
    result = bind.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum'"))
    if not result.scalar():
        transaction_type_enum = sa.Enum(
            'INBOUND_RECEIVE',
            'PUTAWAY',
            'MOVE',
            'PICK',
            'SHIP',
            'ADJUSTMENT',
            'STATUS_CHANGE',
            'PALLET_SPLIT',
            'PALLET_MERGE',
            name='transaction_type_enum'
        )
        transaction_type_enum.create(bind)

    # 3. Create inventory table (Current Stock Snapshot - Quants/LPNs)
    op.create_table(
        'inventory',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('depositor_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('lpn', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column('status', sa.Enum('AVAILABLE', 'RESERVED', 'QUARANTINE', 'DAMAGED', 'MISSING', name='inventory_status_enum'), nullable=False),
        sa.Column('batch_number', sa.String(length=255), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('fifo_date', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['depositor_id'], ['depositors.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'lpn', name='uq_tenant_lpn'),
        sa.CheckConstraint('quantity >= 0', name='ck_inventory_quantity_positive')
    )

    # Create indexes for inventory table
    op.create_index(op.f('ix_inventory_id'), 'inventory', ['id'], unique=False)
    op.create_index('ix_inventory_tenant_id', 'inventory', ['tenant_id'])
    op.create_index('ix_inventory_depositor_id', 'inventory', ['depositor_id'])
    op.create_index('ix_inventory_product_id', 'inventory', ['product_id'])
    op.create_index('ix_inventory_location_id', 'inventory', ['location_id'])
    op.create_index('ix_inventory_lpn', 'inventory', ['lpn'])
    op.create_index('ix_inventory_status', 'inventory', ['status'])
    op.create_index('ix_inventory_batch_number', 'inventory', ['batch_number'])
    op.create_index('ix_inventory_expiry_date', 'inventory', ['expiry_date'])
    op.create_index('ix_inventory_fifo_date', 'inventory', ['fifo_date'])
    op.create_index('ix_inventory_tenant_product', 'inventory', ['tenant_id', 'product_id'])
    op.create_index('ix_inventory_tenant_location', 'inventory', ['tenant_id', 'location_id'])
    op.create_index('ix_inventory_tenant_depositor', 'inventory', ['tenant_id', 'depositor_id'])

    # 4. Create inventory_transactions table (The Ledger - Immutable)
    op.create_table(
        'inventory_transactions',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('transaction_type', sa.Enum('INBOUND_RECEIVE', 'PUTAWAY', 'MOVE', 'PICK', 'SHIP', 'ADJUSTMENT', 'STATUS_CHANGE', 'PALLET_SPLIT', 'PALLET_MERGE', name='transaction_type_enum'), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('from_location_id', sa.Integer(), nullable=True),
        sa.Column('to_location_id', sa.Integer(), nullable=True),
        sa.Column('inventory_id', sa.BigInteger(), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column('reference_doc', sa.String(length=255), nullable=True),
        sa.Column('performed_by', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('billing_metadata', JSONB, nullable=False, server_default='{}'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['from_location_id'], ['locations.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['to_location_id'], ['locations.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['inventory_id'], ['inventory.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['performed_by'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('quantity > 0', name='ck_transaction_quantity_positive'),
        sa.CheckConstraint(
            '(transaction_type = \'MOVE\' AND from_location_id IS NOT NULL AND to_location_id IS NOT NULL) OR ' +
            '(transaction_type IN (\'INBOUND_RECEIVE\', \'PUTAWAY\') AND to_location_id IS NOT NULL) OR ' +
            '(transaction_type IN (\'PICK\', \'SHIP\') AND from_location_id IS NOT NULL) OR ' +
            '(transaction_type IN (\'ADJUSTMENT\', \'STATUS_CHANGE\', \'PALLET_SPLIT\', \'PALLET_MERGE\'))',
            name='ck_transaction_location_logic'
        )
    )

    # Create indexes for inventory_transactions table
    op.create_index(op.f('ix_inventory_transactions_id'), 'inventory_transactions', ['id'], unique=False)
    op.create_index('ix_inventory_transactions_tenant_id', 'inventory_transactions', ['tenant_id'])
    op.create_index('ix_inventory_transactions_transaction_type', 'inventory_transactions', ['transaction_type'])
    op.create_index('ix_inventory_transactions_product_id', 'inventory_transactions', ['product_id'])
    op.create_index('ix_inventory_transactions_inventory_id', 'inventory_transactions', ['inventory_id'])
    op.create_index('ix_inventory_transactions_performed_by', 'inventory_transactions', ['performed_by'])
    op.create_index('ix_inventory_transactions_timestamp', 'inventory_transactions', ['timestamp'])
    op.create_index('ix_inventory_transactions_reference_doc', 'inventory_transactions', ['reference_doc'])
    op.create_index('ix_inventory_transactions_tenant_timestamp', 'inventory_transactions', ['tenant_id', 'timestamp'])
    op.create_index('ix_inventory_transactions_tenant_product', 'inventory_transactions', ['tenant_id', 'product_id'])

    # 5. Create system_audit_logs table (Administrative Audit)
    op.create_table(
        'system_audit_logs',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('changes', JSONB, nullable=False, server_default='{}'),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            'action IN (\'CREATE\', \'UPDATE\', \'DELETE\')',
            name='ck_audit_action_valid'
        )
    )

    # Create indexes for system_audit_logs table
    op.create_index(op.f('ix_system_audit_logs_id'), 'system_audit_logs', ['id'], unique=False)
    op.create_index('ix_system_audit_logs_tenant_id', 'system_audit_logs', ['tenant_id'])
    op.create_index('ix_system_audit_logs_user_id', 'system_audit_logs', ['user_id'])
    op.create_index('ix_system_audit_logs_entity_type', 'system_audit_logs', ['entity_type'])
    op.create_index('ix_system_audit_logs_entity_id', 'system_audit_logs', ['entity_id'])
    op.create_index('ix_system_audit_logs_action', 'system_audit_logs', ['action'])
    op.create_index('ix_system_audit_logs_timestamp', 'system_audit_logs', ['timestamp'])
    op.create_index('ix_system_audit_logs_entity', 'system_audit_logs', ['entity_type', 'entity_id'])
    op.create_index('ix_system_audit_logs_tenant_timestamp', 'system_audit_logs', ['tenant_id', 'timestamp'])


def downgrade() -> None:
    # Drop system_audit_logs table
    op.drop_index('ix_system_audit_logs_tenant_timestamp', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_entity', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_timestamp', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_action', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_entity_id', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_entity_type', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_user_id', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_tenant_id', table_name='system_audit_logs')
    op.drop_index(op.f('ix_system_audit_logs_id'), table_name='system_audit_logs')
    op.drop_table('system_audit_logs')

    # Drop inventory_transactions table
    op.drop_index('ix_inventory_transactions_tenant_product', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_tenant_timestamp', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_reference_doc', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_timestamp', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_performed_by', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_inventory_id', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_product_id', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_transaction_type', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_tenant_id', table_name='inventory_transactions')
    op.drop_index(op.f('ix_inventory_transactions_id'), table_name='inventory_transactions')
    op.drop_table('inventory_transactions')

    # Drop inventory table
    op.drop_index('ix_inventory_tenant_depositor', table_name='inventory')
    op.drop_index('ix_inventory_tenant_location', table_name='inventory')
    op.drop_index('ix_inventory_tenant_product', table_name='inventory')
    op.drop_index('ix_inventory_fifo_date', table_name='inventory')
    op.drop_index('ix_inventory_expiry_date', table_name='inventory')
    op.drop_index('ix_inventory_batch_number', table_name='inventory')
    op.drop_index('ix_inventory_status', table_name='inventory')
    op.drop_index('ix_inventory_lpn', table_name='inventory')
    op.drop_index('ix_inventory_location_id', table_name='inventory')
    op.drop_index('ix_inventory_product_id', table_name='inventory')
    op.drop_index('ix_inventory_depositor_id', table_name='inventory')
    op.drop_index('ix_inventory_tenant_id', table_name='inventory')
    op.drop_index(op.f('ix_inventory_id'), table_name='inventory')
    op.drop_table('inventory')

    # Drop enums
    # הערה: הורדת Enums ב-Postgres יכולה להיות בעייתית, לכן משאירים אותם לרוב
    # אבל אם רוצים לנקות:
    op.execute("DROP TYPE IF EXISTS transaction_type_enum CASCADE")
    op.execute("DROP TYPE IF EXISTS inventory_status_enum CASCADE")
