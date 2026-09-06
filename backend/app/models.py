import datetime
import enum

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class TradeDirection(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    broker: Mapped[str] = mapped_column(String(120))
    initial_balance: Mapped[float] = mapped_column(Numeric(14, 2))

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
