from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import PriorityConfirmation, Period
from ..schemas import PrioritiesSet, PriorityOut
from ..auth import require_coach

router = APIRouter(prefix="/priorities", tags=["priorities"])


@router.get("", response_model=list[PriorityOut])
def get_priorities(period_id: int, player_name: str, db: Session = Depends(get_db), _=Depends(require_coach)):
    return (
        db.query(PriorityConfirmation)
        .filter(
            PriorityConfirmation.period_id == period_id,
            func.lower(PriorityConfirmation.player_name) == player_name.lower(),
        )
        .order_by(PriorityConfirmation.rank)
        .all()
    )


@router.put("", response_model=list[PriorityOut])
def set_priorities(body: PrioritiesSet, db: Session = Depends(get_db), _=Depends(require_coach)):
    if not db.query(Period).filter(Period.id == body.period_id).first():
        raise HTTPException(404, "Period not found")

    # Replace the whole confirmed set for this player + period.
    db.query(PriorityConfirmation).filter(
        PriorityConfirmation.period_id == body.period_id,
        func.lower(PriorityConfirmation.player_name) == body.player_name.lower(),
    ).delete(synchronize_session=False)

    for p in body.priorities:
        db.add(PriorityConfirmation(
            period_id=body.period_id,
            player_name=body.player_name,
            skill_id=p.skill_id,
            rank=p.rank,
            algorithm_suggested=p.algorithm_suggested,
            coach_note=p.coach_note,
        ))
    db.commit()

    return (
        db.query(PriorityConfirmation)
        .filter(
            PriorityConfirmation.period_id == body.period_id,
            func.lower(PriorityConfirmation.player_name) == body.player_name.lower(),
        )
        .order_by(PriorityConfirmation.rank)
        .all()
    )
