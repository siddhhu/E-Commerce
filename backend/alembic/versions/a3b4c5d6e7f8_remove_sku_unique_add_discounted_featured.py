"""remove sku unique constraint and add is_discounted_featured

Revision ID: a3b4c5d6e7f8
Revises: f6a7b8c9d0e1
Create Date: 2026-06-20

"""
from alembic import op
import sqlalchemy as sa


revision = 'a3b4c5d6e7f8'
down_revision = ('f6a7b8c9d0e1', '0185bdd95aaa')  # Merge both branch heads
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove unique constraint on products.sku so the same HSN code can be shared
    op.drop_index('ix_products_sku', table_name='products')
    op.create_index('ix_products_sku', 'products', ['sku'], unique=False)

    # Add is_discounted_featured flag — admin-curated: show product in Live Discounts on home page
    op.add_column(
        'products',
        sa.Column('is_discounted_featured', sa.Boolean(), nullable=False, server_default=sa.false())
    )


def downgrade() -> None:
    op.drop_column('products', 'is_discounted_featured')

    # Restore unique constraint on sku
    op.drop_index('ix_products_sku', table_name='products')
    op.create_index('ix_products_sku', 'products', ['sku'], unique=True)
