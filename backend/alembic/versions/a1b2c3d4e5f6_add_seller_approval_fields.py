"""add seller approval fields

Revision ID: a1b2c3d4e5f6
Revises: 9c4d2f1b7e21
Create Date: 2026-05-18

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '9c4d2f1b7e21'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add seller onboarding columns to users table
    op.add_column('users', sa.Column('seller_status', sa.String(length=20), nullable=False, server_default='none'))
    op.add_column('users', sa.Column('seller_invoice_url', sa.String(length=1024), nullable=True))
    op.add_column('users', sa.Column('seller_username', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('seller_plain_password', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'seller_plain_password')
    op.drop_column('users', 'seller_username')
    op.drop_column('users', 'seller_invoice_url')
    op.drop_column('users', 'seller_status')
