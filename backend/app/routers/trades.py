from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.db import get_db

router = APIRouter(prefix="/trades", tags=["trades"])


@router.get("/", response_model=list[schemas.TradeOut])
def list_trades(account_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Trade)
    if account_id is not None:
        query = query.filter(models.Trade.account_id == account_id)
    return query.order_by(models.Trade.opened_at.desc()).all()


@router.post("/", response_model=schemas.TradeOut)
def create_trade(trade: schemas.TradeCreate, db: Session = Depends(get_db)):
    db_trade = models.Trade(**trade.model_dump())
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)
    return db_trade


@router.get("/{trade_id}", response_model=schemas.TradeOut)
def get_trade(trade_id: int, db: Session = Depends(get_db)):
    trade = db.get(models.Trade, trade_id)
    if trade is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.delete("/{trade_id}", status_code=204)
def delete_trade(trade_id: int, db: Session = Depends(get_db)):
    trade = db.get(models.Trade, trade_id)
    if trade is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    db.delete(trade)
    db.commit()
