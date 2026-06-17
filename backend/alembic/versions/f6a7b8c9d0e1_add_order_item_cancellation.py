"""add order item cancellation

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa


revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('order_items', sa.Column('is_cancelled', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('order_items', sa.Column('cancelled_at', sa.DateTime(), nullable=True))
    op.add_column('order_items', sa.Column('cancellation_reason', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('order_items', 'cancellation_reason')
    op.drop_column('order_items', 'cancelled_at')
    op.drop_column('order_items', 'is_cancelled')
