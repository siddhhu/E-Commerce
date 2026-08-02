"""add_kyc_document_fields

Revision ID: c8d9e0f1a2b3
Revises: b1c2d3e4f5a6
Create Date: 2026-08-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("voter_id", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("msme_number", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("udyog_aadhar", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("shop_establishment_license", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("kyc_document_type", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("kyc_document_url", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("kyc_verified_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "kyc_verified_at")
    op.drop_column("users", "kyc_document_url")
    op.drop_column("users", "kyc_document_type")
    op.drop_column("users", "shop_establishment_license")
    op.drop_column("users", "udyog_aadhar")
    op.drop_column("users", "msme_number")
    op.drop_column("users", "voter_id")
