from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PeriodCreate(BaseModel):
    label: str
    is_active: bool = True


class PeriodOut(BaseModel):
    id: int
    label: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RatingIn(BaseModel):
    skill_id: str
    score: Optional[int] = Field(None, ge=1, le=5)


class PlayerAssessmentCreate(BaseModel):
    player_name: str = Field(..., min_length=1, max_length=100)
    position: str = Field(..., pattern="^(outfield|goalkeeper)$")
    period_id: int
    ratings: list[RatingIn]


class CoachAssessmentCreate(BaseModel):
    player_name: str = Field(..., min_length=1, max_length=100)
    position: str = Field(..., pattern="^(outfield|goalkeeper)$")
    period_id: int
    ratings: list[RatingIn]


class RatingOut(BaseModel):
    skill_id: str
    score: Optional[int]

    class Config:
        from_attributes = True


class AssessmentOut(BaseModel):
    id: int
    player_name: str
    position: str
    assessor: str
    created_at: datetime
    updated_at: Optional[datetime]
    ratings: list[RatingOut]

    class Config:
        from_attributes = True
