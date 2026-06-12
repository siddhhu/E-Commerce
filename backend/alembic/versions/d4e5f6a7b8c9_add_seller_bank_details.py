"""add seller bank details

Revision ID: d4e5f6a7b8c9
Revises: c1d2e3f4g5h6
Create Date: 2026-06-12

"""
from alembic import op
import sqlalchemy as sa


revision = 'd4e5f6a7b8c9'
down_revision = 'c1d2e3f4g5h6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('bank_account_holder_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('bank_account_number', sa.String(length=40), nullable=True))
    op.add_column('users', sa.Column('bank_ifsc', sa.String(length=11), nullable=True))
    op.add_column('users', sa.Column('bank_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'bank_name')
    op.drop_column('users', 'bank_ifsc')
    op.drop_column('users', 'bank_account_number')
    op.drop_column('users', 'bank_account_holder_name')
