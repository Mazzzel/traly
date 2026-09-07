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


class TradeClose(BaseModel):
    exit_price: float
    pnl: float
    closed_at: datetime.datetime | None = None


class EquityPoint(BaseModel):
    closed_at: datetime.datetime
    cumulative_pnl: float


class AccountStats(BaseModel):
    total_trades: int
    closed_trades: int
    win_rate: float | None
    profit_factor: float | None
    avg_win: float | None
    avg_loss: float | None
    best_trade: float | None
    worst_trade: float | None
    equity_curve: list[EquityPoint]


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    must_change_password: bool


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    must_change_password: bool
    is_admin: bool
