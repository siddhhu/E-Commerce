"""Add browse performance indexes for product catalog queries."""

from typing import Sequence, Union

from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_product_images_product_id "
        "ON product_images (product_id, is_primary DESC, sort_order)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_products_category_active "
        "ON products (category_id, is_active)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_products_slug")
    op.execute("DROP INDEX IF EXISTS idx_products_category_active")
    op.execute("DROP INDEX IF EXISTS idx_product_images_product_id")
