from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Period
from ..schemas import PeriodCreate, PeriodOut
from ..auth import require_coach

router = APIRouter(prefix="/periods", tags=["periods"])


@router.get("/", response_model=list[PeriodOut])
def list_periods(db: Session = Depends(get_db)):
    return db.query(Period).order_by(Period.created_at.desc()).all()


@router.post("/", response_model=PeriodOut)
def create_period(body: PeriodCreate, db: Session = Depends(get_db), _=Depends(require_coach)):
    if db.query(Period).filter(Period.label == body.label).first():
        raise HTTPException(400, "Period with this label already exists")
    period = Period(**body.model_dump())
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


@router.patch("/{period_id}/activate", response_model=PeriodOut)
def set_active(period_id: int, db: Session = Depends(get_db), _=Depends(require_coach)):
    period = db.query(Period).filter(Period.id == period_id).first()
    if not period:
        raise HTTPException(404, "Period not found")
    # deactivate all others
    db.query(Period).update({"is_active": False})
    period.is_active = True
    db.commit()
    db.refresh(period)
    return period
