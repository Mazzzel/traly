import datetime

from pydantic import BaseModel, ConfigDict

from app.models import TradeDirection


class AccountBase(BaseModel):
    name: str
    broker: str
    initial_balance: float


class AccountCreate(AccountBase):
    pass


class AccountOut(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class TradeBase(BaseModel):
    account_id: int
    symbol: str
    direction: TradeDirection
    entry_price: float
    exit_price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    size: float
    pnl: float | None = None
    opened_at: datetime.datetime
    closed_at: datetime.datetime | None = None
    notes: str | None = None


class TradeCreate(TradeBase):
    pass


class TradeOut(TradeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
