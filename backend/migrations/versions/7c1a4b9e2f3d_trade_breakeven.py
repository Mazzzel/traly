"""trade break-even flag

Revision ID: 7c1a4b9e2f3d
Revises: 33ccd60d36e9
Create Date: 2026-09-07

"""
from alembic import op
import sqlalchemy as sa

revision = "7c1a4b9e2f3d"
down_revision = "33ccd60d36e9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trades",
        sa.Column("is_breakeven", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("trades", "is_breakeven")
