"""add_contact_email_to_users

Revision ID: 52d24caffb34
Revises: a1b2c3d4e5f6
Create Date: 2026-05-18 14:15:57.881157

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '52d24caffb34'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add optional contact_email column for notifications
    op.add_column('users', sa.Column('contact_email', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'contact_email')
