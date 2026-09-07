import datetime
import enum

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class TradeDirection(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(60))
    must_change_password: Mapped[bool] = mapped_column(default=True)
    is_admin: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    accounts: Mapped[list["Account"]] = relationship(back_populates="user")
    symbol_specs: Mapped[list["SymbolSpec"]] = relationship(back_populates="user")


class SymbolSpec(Base):
    """Taille de contrat par symbole (ex: 100 oz/lot pour XAUUSD), pour calculer
    automatiquement le PnL: (sortie - entrée) * taille * contract_size."""

    __tablename__ = "symbol_specs"
    __table_args__ = (UniqueConstraint("user_id", "symbol", name="uq_symbol_specs_user_symbol"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    symbol: Mapped[str] = mapped_column(String(20))
    contract_size: Mapped[float] = mapped_column(Numeric(14, 4))

    user: Mapped["User"] = relationship(back_populates="symbol_specs")


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(120))
    broker: Mapped[str] = mapped_column(String(120))
    initial_balance: Mapped[float] = mapped_column(Numeric(14, 2))

    user: Mapped["User"] = relationship(back_populates="accounts")
    trades: Mapped[list["Trade"]] = relationship(back_populates="account")


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    symbol: Mapped[str] = mapped_column(String(20))
    direction: Mapped[TradeDirection] = mapped_column(
        Enum(TradeDirection, values_callable=lambda enum_cls: [e.value for e in enum_cls])
    )
    entry_price: Mapped[float] = mapped_column(Numeric(14, 5))
    exit_price: Mapped[float | None] = mapped_column(Numeric(14, 5), nullable=True)
    stop_loss: Mapped[float | None] = mapped_column(Numeric(14, 5), nullable=True)
    take_profit: Mapped[float | None] = mapped_column(Numeric(14, 5), nullable=True)
    size: Mapped[float] = mapped_column(Numeric(14, 4))
    pnl: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    opened_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    account: Mapped["Account"] = relationship(back_populates="trades")
