"""initial schema

Revision ID: 0f9f526a9a5b
Revises:
Create Date: 2026-09-06

"""
from alembic import op
import sqlalchemy as sa

revision = "0f9f526a9a5b"
down_revision = None
branch_labels = None
depends_on = None

trade_direction = sa.Enum("buy", "sell", name="tradedirection")


def upgrade() -> None:
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("broker", sa.String(120), nullable=False),
        sa.Column("initial_balance", sa.Numeric(14, 2), nullable=False),
    )

    op.create_table(
        "trades",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("direction", trade_direction, nullable=False),
        sa.Column("entry_price", sa.Numeric(14, 5), nullable=False),
        sa.Column("exit_price", sa.Numeric(14, 5), nullable=True),
        sa.Column("stop_loss", sa.Numeric(14, 5), nullable=True),
        sa.Column("take_profit", sa.Numeric(14, 5), nullable=True),
        sa.Column("size", sa.Numeric(14, 4), nullable=False),
        sa.Column("pnl", sa.Numeric(14, 2), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.String(2000), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("trades")
    trade_direction.drop(op.get_bind(), checkfirst=False)
    op.drop_table("accounts")
