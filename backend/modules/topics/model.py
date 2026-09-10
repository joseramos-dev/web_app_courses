from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from core.database import Base


class TopicModel(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String, nullable=False)
    position = Column(Integer, nullable=False)

    course = relationship("CourseModel", back_populates="topics")
    lessons = relationship(
        "LessonModel",
        back_populates="topic",
        cascade="all, delete-orphan",
        order_by="LessonModel.position",
    )

    __table_args__ = (
        UniqueConstraint("course_id", "position", name="uq_topic_course_position"),
    )
