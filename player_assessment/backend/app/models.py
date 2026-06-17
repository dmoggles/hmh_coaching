from sqlalchemy import Column, Integer, String, SmallInteger, DateTime, UniqueConstraint, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Period(Base):
    __tablename__ = "periods"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assessments = relationship("Assessment", back_populates="period")


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (
        UniqueConstraint("player_name", "period_id", "assessor", name="uq_player_period_assessor"),
    )

    id = Column(Integer, primary_key=True, index=True)
    player_name = Column(String(100), nullable=False, index=True)
    position = Column(String(20), nullable=False)  # outfield | goalkeeper (drives skill set)
    primary_position = Column(String(20), nullable=True)  # Goalkeeper | Defender | Midfielder | Winger | Striker
    secondary_position = Column(String(20), nullable=True)
    secondary_position_frequency = Column(String(20), nullable=True)  # rarely | sometimes | often
    period_id = Column(Integer, ForeignKey("periods.id"), nullable=False)
    assessor = Column(String(10), nullable=False)  # coach | player
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    period = relationship("Period", back_populates="assessments")
    ratings = relationship("Rating", back_populates="assessment", cascade="all, delete-orphan")


class PriorityConfirmation(Base):
    __tablename__ = "priority_confirmations"
    __table_args__ = (
        UniqueConstraint("period_id", "player_name", "skill_id", name="uq_priority_player_skill"),
    )

    id = Column(Integer, primary_key=True, index=True)
    period_id = Column(Integer, ForeignKey("periods.id"), nullable=False)
    player_name = Column(String(100), nullable=False, index=True)
    skill_id = Column(String(50), nullable=False)
    rank = Column(SmallInteger, nullable=False)  # 1 = highest priority
    algorithm_suggested = Column(Boolean, nullable=False, default=True)
    coach_note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    skill_id = Column(String(50), nullable=False)
    score = Column(SmallInteger, nullable=True)

    assessment = relationship("Assessment", back_populates="ratings")
