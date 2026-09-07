import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_active_user
from app.db import get_db

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=list[schemas.AccountOut])
def list_accounts(
    db: Session = Depends(get_db), user: models.User = Depends(require_active_user)
):
    return db.query(models.Account).filter(models.Account.user_id == user.id).all()


@router.post("/", response_model=schemas.AccountOut)
def create_account(
    account: schemas.AccountCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_active_user),
):
    db_account = models.Account(**account.model_dump(), user_id=user.id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


def _get_owned_account(account_id: int, db: Session, user: models.User) -> models.Account:
    account = db.get(models.Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


def _current_balance(account: models.Account) -> float:
    """Solde actuel = dépôt initial + PnL de tous les trades clôturés - tous les retraits."""
    pnl = sum(float(t.pnl) for t in account.trades if t.closed_at is not None and t.pnl is not None)
    withdrawn = sum(float(w.amount) for w in account.withdrawals)
    return float(account.initial_balance) + pnl - withdrawn


def _active_trades_and_baseline(
    account: models.Account,
) -> tuple[list[models.Trade], float, datetime.datetime | None]:
    """Trades de la période en cours (depuis le dernier retrait, ou depuis l'origine
    du compte s'il n'y en a aucun) + le solde de référence de cette période."""
    last_withdrawal = account.withdrawals[-1] if account.withdrawals else None

    if last_withdrawal is None:
        return list(account.trades), float(account.initial_balance), None

    period_start_at = last_withdrawal.withdrawn_at
    active = [
        t
        for t in account.trades
        if t.closed_at is None or t.closed_at > period_start_at
    ]
    return active, float(last_withdrawal.balance_after), period_start_at


def _compute_stats(
    trades: list[models.Trade], period_start_balance: float, period_start_at: datetime.datetime | None
) -> schemas.AccountStats:
    closed = [t for t in trades if t.closed_at is not None and t.pnl is not None]
    closed.sort(key=lambda t: t.closed_at)

    wins = [float(t.pnl) for t in closed if float(t.pnl) > 0]
    losses = [float(t.pnl) for t in closed if float(t.pnl) < 0]
    pnls = [float(t.pnl) for t in closed]

    cumulative = 0.0
    equity_curve = []
    peak = 0.0
    max_drawdown = 0.0
    for t in closed:
        cumulative += float(t.pnl)
        equity_curve.append(schemas.EquityPoint(closed_at=t.closed_at, cumulative_pnl=cumulative))
        peak = max(peak, cumulative)
        max_drawdown = max(max_drawdown, peak - cumulative)

    gross_win = sum(wins)
    gross_loss = abs(sum(losses))

    max_win_streak = 0
    max_loss_streak = 0
    current_win_streak = 0
    current_loss_streak = 0
    for t in closed:
        if float(t.pnl) > 0:
            current_win_streak += 1
            current_loss_streak = 0
        elif float(t.pnl) < 0:
            current_loss_streak += 1
            current_win_streak = 0
        else:
            current_win_streak = 0
            current_loss_streak = 0
        max_win_streak = max(max_win_streak, current_win_streak)
        max_loss_streak = max(max_loss_streak, current_loss_streak)

    durations = [
        (t.closed_at - t.opened_at).total_seconds() for t in closed if t.opened_at is not None
    ]

    return schemas.AccountStats(
        total_trades=len(trades),
        closed_trades=len(closed),
        winning_trades=len(wins),
        losing_trades=len(losses),
        win_rate=len(wins) / len(closed) if closed else None,
        profit_factor=(gross_win / gross_loss) if gross_loss > 0 else None,
        total_gain=gross_win if closed else None,
        total_loss=sum(losses) if closed else None,
        expectancy=(sum(pnls) / len(pnls)) if pnls else None,
        max_drawdown=max_drawdown if closed else None,
        avg_win=(sum(wins) / len(wins)) if wins else None,
        avg_loss=(sum(losses) / len(losses)) if losses else None,
        best_trade=max(pnls) if pnls else None,
        worst_trade=min(pnls) if pnls else None,
        max_win_streak=max_win_streak,
        max_loss_streak=max_loss_streak,
        avg_trade_duration_seconds=(sum(durations) / len(durations)) if durations else None,
        equity_curve=equity_curve,
        period_start_balance=period_start_balance,
        period_start_at=period_start_at,
    )


@router.get("/stats", response_model=schemas.AccountStats)
def overall_stats(
    db: Session = Depends(get_db), user: models.User = Depends(require_active_user)
):
    accounts = db.query(models.Account).filter(models.Account.user_id == user.id).all()

    all_trades: list[models.Trade] = []
    total_baseline = 0.0
    for account in accounts:
        active, baseline, _ = _active_trades_and_baseline(account)
        all_trades.extend(active)
        total_baseline += baseline

    return _compute_stats(all_trades, total_baseline, None)


@router.get("/{account_id}/stats", response_model=schemas.AccountStats)
def account_stats(
    account_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_active_user),
):
    account = _get_owned_account(account_id, db, user)
    active, baseline, period_start_at = _active_trades_and_baseline(account)
    return _compute_stats(active, baseline, period_start_at)


@router.post("/{account_id}/withdrawals", response_model=schemas.WithdrawalOut)
def create_withdrawal(
    account_id: int,
    payload: schemas.WithdrawalCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_active_user),
):
    account = _get_owned_account(account_id, db, user)
    if payload.amount <= 0:
        raise HTTPException(status_code=422, detail="amount must be positive")

    current_balance = _current_balance(account)
    withdrawn_at = payload.withdrawn_at or datetime.datetime.now(datetime.timezone.utc)

    withdrawal = models.Withdrawal(
        account_id=account.id,
        amount=payload.amount,
        balance_after=current_balance - payload.amount,
        withdrawn_at=withdrawn_at,
    )
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    return withdrawal


@router.get("/{account_id}/withdrawals", response_model=list[schemas.WithdrawalOut])
def list_withdrawals(
    account_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_active_user),
):
    account = _get_owned_account(account_id, db, user)
    return account.withdrawals


@router.get("/{account_id}/archives", response_model=list[schemas.ArchivePeriod])
def list_archives(
    account_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_active_user),
):
    account = _get_owned_account(account_id, db, user)
    withdrawals = list(account.withdrawals)  # already ordered ascending by withdrawn_at

    periods = []
    period_start: datetime.datetime | None = None
    for withdrawal in withdrawals:
        trades = [
            t
            for t in account.trades
            if t.closed_at is not None
            and (period_start is None or t.closed_at > period_start)
            and t.closed_at <= withdrawal.withdrawn_at
        ]
        trades.sort(key=lambda t: t.closed_at, reverse=True)
        periods.append(
            schemas.ArchivePeriod(
                withdrawal=withdrawal,
                period_start_at=period_start,
                trades=trades,
                trade_count=len(trades),
                pnl=sum(float(t.pnl) for t in trades if t.pnl is not None),
            )
        )
        period_start = withdrawal.withdrawn_at

    periods.reverse()  # most recent period first
    return periods
