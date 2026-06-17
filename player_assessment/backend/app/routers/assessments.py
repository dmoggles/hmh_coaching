from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from ..models import Assessment, Rating, Period
from ..schemas import PlayerAssessmentCreate, CoachAssessmentCreate, AssessmentOut
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
        Assessment.player_name == body.player_name,
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
        Assessment.player_name == body.player_name,
        Assessment.period_id == body.period_id,
        Assessment.assessor == "coach",
    ).first()

    position = "goalkeeper" if body.primary_position == "Goalkeeper" else "outfield"

    if existing:
        _upsert_ratings(db, existing, body.ratings)
        existing.position = position
        existing.primary_position = body.primary_position
        existing.secondary_position = body.secondary_position
        db.commit()
        db.refresh(existing)
        return existing

    assessment = Assessment(
        player_name=body.player_name,
        position=position,
        primary_position=body.primary_position,
        secondary_position=body.secondary_position,
        period_id=body.period_id,
        assessor="coach",
    )
    db.add(assessment)
    db.flush()
    _upsert_ratings(db, assessment, body.ratings)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/period/{period_id}", response_model=list[AssessmentOut])
def get_assessments_for_period(period_id: int, db: Session = Depends(get_db), _=Depends(require_coach)):
    return db.query(Assessment).filter(Assessment.period_id == period_id).all()


@router.get("/period/{period_id}/players")
def get_player_names_for_period(period_id: int, db: Session = Depends(get_db), _=Depends(require_coach)):
    rows = db.query(
        Assessment.player_name,
        Assessment.position,
        Assessment.primary_position,
        Assessment.secondary_position,
    ).filter(
        Assessment.period_id == period_id
    ).distinct().all()
    return [
        {
            "player_name": r.player_name,
            "position": r.position,
            "primary_position": r.primary_position,
            "secondary_position": r.secondary_position,
        }
        for r in rows
    ]
