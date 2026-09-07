"""account withdrawals (closes a trading period / archives)

Revision ID: 2f6e9a0c4d18
Revises: 9d8e5c6a1b47
Create Date: 2026-09-07

"""
from alembic import op
import sqlalchemy as sa

revision = "2f6e9a0c4d18"
down_revision = "9d8e5c6a1b47"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "withdrawals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "account_id",
            sa.Integer(),
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("balance_after", sa.Numeric(14, 2), nullable=False),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_withdrawals_account_id", "withdrawals", ["account_id"])


def downgrade() -> None:
    op.drop_index("ix_withdrawals_account_id", table_name="withdrawals")
    op.drop_table("withdrawals")
