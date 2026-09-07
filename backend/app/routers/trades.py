import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_active_user
from app.db import get_db

router = APIRouter(prefix="/trades", tags=["trades"])


def _owned_account_ids(db: Session, user: models.User) -> list[int]:
    return [a.id for a in db.query(models.Account.id).filter(models.Account.user_id == user.id)]


@router.get("/", response_model=list[schemas.TradeOut])
def list_trades(
    account_id: int | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_active_user),
):
    owned_ids = _owned_account_ids(db, user)
    if account_id is not None:
        if account_id not in owned_ids:
            raise HTTPException(status_code=404, detail="Account not found")
        owned_ids = [account_id]

    return (
        db.query(models.Trade)
        .filter(models.Trade.account_id.in_(owned_ids))
        .order_by(models.Trade.opened_at.desc())
        .all()
    )


@router.post("/", response_model=schemas.TradeOut)
def create_trade(
    trade: schemas.TradeCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_active_user),
):
    account = db.get(models.Account, trade.account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")

    db_trade = models.Trade(**trade.model_dump())
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)
    return db_trade


def _get_owned_trade(trade_id: int, db: Session, user: models.User) -> models.Trade:
    trade = db.get(models.Trade, trade_id)
    if trade is None or trade.account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.get("/{trade_id}", response_model=schemas.TradeOut)
def get_trade(
    trade_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_active_user)
):
    return _get_owned_trade(trade_id, db, user)


@router.delete("/{trade_id}", status_code=204)
def delete_trade(
    trade_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_active_user)
):
    trade = _get_owned_trade(trade_id, db, user)
    db.delete(trade)
    db.commit()


EPSILON = 1e-6


@router.post("/{trade_id}/exits", response_model=schemas.TradeOut)
def add_trade_exit(
    trade_id: int,
    payload: schemas.TradeExitCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_active_user),
):
    trade = _get_owned_trade(trade_id, db, user)
    if trade.closed_at is not None:
        raise HTTPException(status_code=400, detail="Trade already closed")
    if not (0 < payload.percent_of_remaining <= 100 + EPSILON):
        raise HTTPException(status_code=422, detail="percent_of_remaining must be in (0, 100]")

    remaining_before = float(trade.size) - sum(float(e.size_closed) for e in trade.exits)
    if remaining_before <= EPSILON:
        raise HTTPException(status_code=400, detail="No remaining size left on this trade")
    pnl_before = sum(float(e.pnl) for e in trade.exits)

    percent = min(payload.percent_of_remaining, 100.0)
    size_closed = remaining_before if percent >= 100 - 1e-3 else remaining_before * (percent / 100)
    remaining_after = remaining_before - size_closed

    closed_at = payload.closed_at or datetime.datetime.now(datetime.timezone.utc)

    exit_ = models.TradeExit(
        trade_id=trade.id,
        sequence=len(trade.exits) + 1,
        percent_of_remaining=percent,
        size_closed=size_closed,
        exit_price=payload.exit_price,
        pnl=payload.pnl,
        closed_at=closed_at,
    )
    db.add(exit_)
    db.flush()

    trade.exit_price = payload.exit_price
    trade.pnl = pnl_before + payload.pnl
    if remaining_after <= EPSILON:
        trade.closed_at = closed_at
        trade.is_breakeven = payload.is_breakeven

    db.commit()
    db.refresh(trade)
    return trade
