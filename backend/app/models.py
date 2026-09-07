import datetime
import enum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint
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
    withdrawals: Mapped[list["Withdrawal"]] = relationship(
        back_populates="account", cascade="all, delete-orphan", order_by="Withdrawal.withdrawn_at"
    )


class Withdrawal(Base):
    """Un retrait de fonds sur un compte. Clôture la période de trading en cours:
    les stats/graphique actuels repartent d'un solde de base égal à `balance_after`,
    et les trades antérieurs à `withdrawn_at` sont archivés (consultables mais plus
    comptés dans les stats actives)."""

    __tablename__ = "withdrawals"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"))
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    balance_after: Mapped[float] = mapped_column(Numeric(14, 2))
    withdrawn_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))

    account: Mapped["Account"] = relationship(back_populates="withdrawals")


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
    is_breakeven: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    account: Mapped["Account"] = relationship(back_populates="trades")
    exits: Mapped[list["TradeExit"]] = relationship(
        back_populates="trade", cascade="all, delete-orphan", order_by="TradeExit.sequence"
    )


class TradeExit(Base):
    """Une sortie (totale ou partielle, ex: TP1/TP2/TP3) sur un trade.

    `percent_of_remaining` s'applique à la taille restante au moment de la
    sortie, pas à la taille d'origine du trade — donc 50% puis 50% ne laisse
    pas 0% mais 25% du lot initial."""

    __tablename__ = "trade_exits"

    id: Mapped[int] = mapped_column(primary_key=True)
    trade_id: Mapped[int] = mapped_column(ForeignKey("trades.id", ondelete="CASCADE"))
    sequence: Mapped[int] = mapped_column()
    percent_of_remaining: Mapped[float] = mapped_column(Numeric(6, 3))
    size_closed: Mapped[float] = mapped_column(Numeric(14, 4))
    exit_price: Mapped[float] = mapped_column(Numeric(14, 5))
    pnl: Mapped[float] = mapped_column(Numeric(14, 2))
    closed_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))

    trade: Mapped["Trade"] = relationship(back_populates="exits")
