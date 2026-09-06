from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.db import get_db

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=list[schemas.AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).all()


@router.post("/", response_model=schemas.AccountOut)
def create_account(account: schemas.AccountCreate, db: Session = Depends(get_db)):
    db_account = models.Account(**account.model_dump())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account
