"""add_promo_codes_and_order_invoice

Revision ID: 9c4d2f1b7e21
Revises: 67ba9be19d92
Create Date: 2026-04-05

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "9c4d2f1b7e21"
down_revision: Union[str, None] = "67ba9be19d92"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "promo_codes",
        sa.Column("code", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column(
            "discount_type",
            sa.Enum("flat", "percent", name="promodiscounttype"),
            nullable=False,
            server_default="flat",
        ),
        sa.Column("discount_value", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "max_discount_amount",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="1000",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("used_count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_promo_codes_code"), "promo_codes", ["code"], unique=True)

    op.add_column("orders", sa.Column("promo_code", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True))
    op.add_column("orders", sa.Column("invoice_url", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "invoice_url")
    op.drop_column("orders", "promo_code")

    op.drop_index(op.f("ix_promo_codes_code"), table_name="promo_codes")
    op.drop_table("promo_codes")

    sa.Enum("flat", "percent", name="promodiscounttype").drop(op.get_bind(), checkfirst=True)
