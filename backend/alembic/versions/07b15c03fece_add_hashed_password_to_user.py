"""add hashed_password to user

Revision ID: 07b15c03fece
Revises: 
Create Date: 2026-03-15 18:58:33.947127

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '07b15c03fece'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use IF NOT EXISTS for PostgreSQL to handle existing columns gracefully
    op.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR')


def downgrade() -> None:
    op.drop_column('users', 'hashed_password')
