"""add shipping_address_data to orders

Revision ID: a8b1c2d3e4f5
Revises: 07b15c03fece
Create Date: 2026-03-16 22:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a8b1c2d3e4f5'
down_revision: Union[str, None] = '07b15c03fece'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add shipping_address_data and gst_number columns if they don't exist
    with op.batch_alter_table('orders', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('shipping_address_data', sa.JSON(), nullable=True))
        except Exception:
            pass  # Column already exists
        try:
            batch_op.add_column(sa.Column('gst_number', sa.String(length=15), nullable=True))
        except Exception:
            pass  # Column already exists


def downgrade() -> None:
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_column('shipping_address_data')
        batch_op.drop_column('gst_number')
