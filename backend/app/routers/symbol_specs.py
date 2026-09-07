from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_active_user
from app.db import get_db

router = APIRouter(prefix="/symbol-specs", tags=["symbol-specs"])


@router.get("/", response_model=list[schemas.SymbolSpecOut])
def list_symbol_specs(
    db: Session = Depends(get_db), user: models.User = Depends(require_active_user)
):
    return db.query(models.SymbolSpec).filter(models.SymbolSpec.user_id == user.id).all()


@router.put("/", response_model=schemas.SymbolSpecOut)
def upsert_symbol_spec(
    payload: schemas.SymbolSpecUpsert,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_active_user),
):
    spec = (
        db.query(models.SymbolSpec)
        .filter(models.SymbolSpec.user_id == user.id, models.SymbolSpec.symbol == payload.symbol)
        .first()
    )
    if spec is None:
        spec = models.SymbolSpec(user_id=user.id, symbol=payload.symbol, contract_size=payload.contract_size)
        db.add(spec)
    else:
        spec.contract_size = payload.contract_size

    db.commit()
    db.refresh(spec)
    return spec
