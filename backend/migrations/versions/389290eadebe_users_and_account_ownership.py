"""users table and account ownership

Revision ID: 389290eadebe
Revises: 0f9f526a9a5b
Create Date: 2026-09-06

"""
from alembic import op
import sqlalchemy as sa

revision = "389290eadebe"
down_revision = "0f9f526a9a5b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(60), nullable=False),
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Données de test antérieures à l'authentification : on repart d'une base propre
    # plutôt que d'inventer un propriétaire fictif pour les comptes existants.
    op.execute("DELETE FROM trades")
    op.execute("DELETE FROM accounts")

    op.add_column("accounts", sa.Column("user_id", sa.Integer(), nullable=False))
    op.create_foreign_key("fk_accounts_user_id", "accounts", "users", ["user_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_accounts_user_id", "accounts", type_="foreignkey")
    op.drop_column("accounts", "user_id")
    op.drop_table("users")
