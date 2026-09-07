"""partial trade exits (TP1/TP2/TP3...)

Revision ID: 9d8e5c6a1b47
Revises: 7c1a4b9e2f3d
Create Date: 2026-09-07

"""
from alembic import op
import sqlalchemy as sa

revision = "9d8e5c6a1b47"
down_revision = "7c1a4b9e2f3d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trade_exits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "trade_id",
            sa.Integer(),
            sa.ForeignKey("trades.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("percent_of_remaining", sa.Numeric(6, 3), nullable=False),
        sa.Column("size_closed", sa.Numeric(14, 4), nullable=False),
        sa.Column("exit_price", sa.Numeric(14, 5), nullable=False),
        sa.Column("pnl", sa.Numeric(14, 2), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_trade_exits_trade_id", "trade_exits", ["trade_id"])


def downgrade() -> None:
    op.drop_index("ix_trade_exits_trade_id", table_name="trade_exits")
    op.drop_table("trade_exits")
