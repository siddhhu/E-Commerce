"""add seller bank proof url

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-12

"""
from alembic import op
import sqlalchemy as sa


revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('seller_bank_proof_url', sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'seller_bank_proof_url')
