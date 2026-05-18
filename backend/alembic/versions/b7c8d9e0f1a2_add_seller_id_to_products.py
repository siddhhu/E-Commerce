"""add seller_id to products

Revision ID: b7c8d9e0f1a2
Revises: 52d24caffb34
Create Date: 2026-05-18

Adds seller_id (FK to users) and seller_name (denormalized) to products table.
- seller_id = NULL  → product owned by Pranjay (super admin / main store)
- seller_id = <uuid> → product owned by that approved seller
"""
from typing import Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = '52d24caffb34'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add seller_id FK column (nullable — NULL means Pranjay store)
    op.add_column(
        'products',
        sa.Column('seller_id', sa.UUID(), nullable=True)
    )
    # Add denormalized seller_name for fast display without joins
    op.add_column(
        'products',
        sa.Column('seller_name', sa.String(255), nullable=True, server_default='Pranjay')
    )
    # Add FK constraint
    op.create_foreign_key(
        'fk_products_seller_id_users',
        'products', 'users',
        ['seller_id'], ['id'],
        ondelete='SET NULL'
    )
    # Existing products: seller_name = 'Pranjay', seller_id = NULL (already NULL by default)
    op.execute("UPDATE products SET seller_name = 'Pranjay' WHERE seller_name IS NULL")


def downgrade() -> None:
    op.drop_constraint('fk_products_seller_id_users', 'products', type_='foreignkey')
    op.drop_column('products', 'seller_name')
    op.drop_column('products', 'seller_id')
