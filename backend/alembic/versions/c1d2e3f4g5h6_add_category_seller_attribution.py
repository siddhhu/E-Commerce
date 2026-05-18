"""Add category seller attribution

Revision ID: c1d2e3f4g5h6
Revises: b7c8d9e0f1a2
Create Date: 2026-05-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'c1d2e3f4g5h6'
down_revision = 'b7c8d9e0f1a2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('categories', sa.Column('seller_id', sqlmodel.sql.sqltypes.GUID(), nullable=True))
    op.add_column('categories', sa.Column('seller_name', sqlmodel.sql.sqltypes.AutoString(length=255), server_default="Pranjay", nullable=True))
    op.create_foreign_key('fk_categories_seller_id_users', 'categories', 'users', ['seller_id'], ['id'])


def downgrade():
    op.drop_constraint('fk_categories_seller_id_users', 'categories', type_='foreignkey')
    op.drop_column('categories', 'seller_name')
    op.drop_column('categories', 'seller_id')
