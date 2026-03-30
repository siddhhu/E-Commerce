"""add_image_url_to_product

Revision ID: 6c1f85a5a117
Revises: a8b1c2d3e4f5
Create Date: 2026-03-16 23:17:48.404265

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '6c1f85a5a117'
down_revision: Union[str, None] = 'a8b1c2d3e4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('products', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('image_url', sa.String(length=500), nullable=True))
        except Exception:
            pass  # Column already exists
        try:
            batch_op.add_column(sa.Column('attributes', sa.JSON(), nullable=True))
        except Exception:
            pass  # Column already exists


def downgrade() -> None:
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_column('image_url')
        batch_op.drop_column('attributes')
