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


@router.get("/{account_id}/stats", response_model=schemas.AccountStats)
def account_stats(
    account_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_active_user),
):
    account = db.get(models.Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")

    all_trades = db.query(models.Trade).filter(models.Trade.account_id == account_id).all()
    closed = [t for t in all_trades if t.closed_at is not None and t.pnl is not None]
    closed.sort(key=lambda t: t.closed_at)

    wins = [float(t.pnl) for t in closed if float(t.pnl) > 0]
    losses = [float(t.pnl) for t in closed if float(t.pnl) < 0]
    pnls = [float(t.pnl) for t in closed]

    cumulative = 0.0
    equity_curve = []
    for t in closed:
        cumulative += float(t.pnl)
        equity_curve.append(schemas.EquityPoint(closed_at=t.closed_at, cumulative_pnl=cumulative))

    gross_win = sum(wins)
    gross_loss = abs(sum(losses))

    return schemas.AccountStats(
        total_trades=len(all_trades),
        closed_trades=len(closed),
        win_rate=len(wins) / len(closed) if closed else None,
        profit_factor=(gross_win / gross_loss) if gross_loss > 0 else None,
        avg_win=(sum(wins) / len(wins)) if wins else None,
        avg_loss=(sum(losses) / len(losses)) if losses else None,
        best_trade=max(pnls) if pnls else None,
        worst_trade=min(pnls) if pnls else None,
        equity_curve=equity_curve,
    )
