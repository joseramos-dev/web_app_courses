from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CourseRatingUpsertSchema(BaseModel):
    score: int = Field(ge=1, le=5)


class CourseRatingSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    course_id: int
    score: int
    created_at: datetime
    updated_at: datetime
