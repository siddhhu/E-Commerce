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
    # Add shipping_address_data column as JSON
    op.add_column('orders', sa.Column('shipping_address_data', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'shipping_address_data')
