from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, UniqueConstraint
from sqlalchemy.sql import func

from core.database import Base


class RecommendationModel(Base):
    __tablename__ = "user_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    preferred_sites = Column(JSON, nullable=False, server_default="[]")
    preferred_categories = Column(JSON, nullable=False, server_default="[]")
    preferred_languages = Column(JSON, nullable=False, server_default="[]")
    preferred_course_types = Column(JSON, nullable=False, server_default="[]")
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_recommendations_user_id"),
    )
