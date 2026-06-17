from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from ..models import Assessment, Rating, Period
from ..schemas import PlayerAssessmentCreate, CoachAssessmentCreate, AssessmentOut, ComparisonOut
from ..auth import require_coach

router = APIRouter(prefix="/assessments", tags=["assessments"])


def _upsert_ratings(db: Session, assessment: Assessment, ratings: list):
    db.query(Rating).filter(Rating.assessment_id == assessment.id).delete()
    for r in ratings:
        db.add(Rating(assessment_id=assessment.id, skill_id=r.skill_id, score=r.score))


@router.post("/player", response_model=AssessmentOut, status_code=201)
def submit_player_assessment(body: PlayerAssessmentCreate, db: Session = Depends(get_db)):
    period = db.query(Period).filter(Period.id == body.period_id).first()
    if not period:
        raise HTTPException(404, "Period not found")

    existing = db.query(Assessment).filter(
        func.lower(Assessment.player_name) == body.player_name.lower(),
        Assessment.period_id == body.period_id,
        Assessment.assessor == "player",
    ).first()
    if existing:
        raise HTTPException(409, "You have already submitted a self-assessment for this period")

    assessment = Assessment(
        player_name=body.player_name,
        position=body.position,
        period_id=body.period_id,
        assessor="player",
    )
    db.add(assessment)
    db.flush()
    _upsert_ratings(db, assessment, body.ratings)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.post("/coach", response_model=AssessmentOut, status_code=201)
def submit_coach_assessment(
    body: CoachAssessmentCreate,
    db: Session = Depends(get_db),
    _=Depends(require_coach),
):
    period = db.query(Period).filter(Period.id == body.period_id).first()
    if not period:
        raise HTTPException(404, "Period not found")

    existing = db.query(Assessment).filter(
        func.lower(Assessment.player_name) == body.player_name.lower(),
        Assessment.period_id == body.period_id,
        Assessment.assessor == "coach",
    ).first()

    position = "goalkeeper" if body.primary_position == "goalkeeper" else "outfield"

    # No secondary position means frequency is meaningless.
    frequency = body.secondary_position_frequency if body.secondary_position else None

    if existing:
        _upsert_ratings(db, existing, body.ratings)
        existing.position = position
        existing.primary_position = body.primary_position
        existing.secondary_position = body.secondary_position
        existing.secondary_position_frequency = frequency
        db.commit()
        db.refresh(existing)
        return existing

    assessment = Assessment(
        player_name=body.player_name,
        position=position,
        primary_position=body.primary_position,
        secondary_position=body.secondary_position,
        secondary_position_frequency=frequency,
        period_id=body.period_id,
        assessor="coach",
    )
    db.add(assessment)
    db.flush()
    _upsert_ratings(db, assessment, body.ratings)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/player/exists")
def player_assessment_exists(period_id: int, player_name: str, db: Session = Depends(get_db)):
    exists = db.query(Assessment).filter(
        func.lower(Assessment.player_name) == player_name.lower(),
        Assessment.period_id == period_id,
        Assessment.assessor == "player",
    ).first() is not None
    return {"submitted": exists}


@router.get("/coach", response_model=Optional[AssessmentOut])
def get_coach_assessment(
    period_id: int,
    player_name: str,
    db: Session = Depends(get_db),
    _=Depends(require_coach),
):
    return db.query(Assessment).filter(
        func.lower(Assessment.player_name) == player_name.lower(),
        Assessment.period_id == period_id,
        Assessment.assessor == "coach",
    ).first()


@router.get("/compare", response_model=ComparisonOut)
def compare_assessments(
    period_id: int,
    player_name: str,
    db: Session = Depends(get_db),
    _=Depends(require_coach),
):
    rows = db.query(Assessment).filter(
        func.lower(Assessment.player_name) == player_name.lower(),
        Assessment.period_id == period_id,
    ).all()
    return {
        "coach": next((a for a in rows if a.assessor == "coach"), None),
        "player": next((a for a in rows if a.assessor == "player"), None),
    }


@router.get("/period/{period_id}", response_model=list[AssessmentOut])
def get_assessments_for_period(period_id: int, db: Session = Depends(get_db), _=Depends(require_coach)):
    return db.query(Assessment).filter(Assessment.period_id == period_id).all()


@router.get("/period/{period_id}/players")
def get_player_names_for_period(period_id: int, db: Session = Depends(get_db), _=Depends(require_coach)):
    rows = db.query(Assessment).filter(Assessment.period_id == period_id).all()
    # One entry per player name; the coach assessment's positions win over the
    # player's self-assessment so the list shows the coach's view of each player.
    by_name = {}
    for a in rows:
        key = a.player_name.lower()
        if key not in by_name or a.assessor == "coach":
            by_name[key] = a
    return [
        {
            "player_name": a.player_name,
            "position": a.position,
            "primary_position": a.primary_position,
            "secondary_position": a.secondary_position,
            "secondary_position_frequency": a.secondary_position_frequency,
        }
        for a in sorted(by_name.values(), key=lambda x: x.player_name.lower())
    ]
