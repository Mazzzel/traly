"""symbol specs (contract size per symbol)

Revision ID: 33ccd60d36e9
Revises: 389290eadebe
Create Date: 2026-09-07

"""
from alembic import op
import sqlalchemy as sa

revision = "33ccd60d36e9"
down_revision = "389290eadebe"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "symbol_specs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("contract_size", sa.Numeric(14, 4), nullable=False),
        sa.UniqueConstraint("user_id", "symbol", name="uq_symbol_specs_user_symbol"),
    )


def downgrade() -> None:
    op.drop_table("symbol_specs")
