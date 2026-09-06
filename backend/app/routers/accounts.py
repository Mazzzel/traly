from fastapi import APIRouter, Depends
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
