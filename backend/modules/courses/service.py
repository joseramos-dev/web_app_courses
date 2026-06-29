from pathlib import Path

import pandas as pd

from fastapi import HTTPException
from sqlalchemy.orm import Session
from modules.courses.model import CourseModel, Difficulty
from modules.courses.schema import CourseCreateSchema, CourseUpdateSchema


def populate_courses(db: Session):
    file_path = Path("data_analysis/online_courses_clean.csv")
    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Archivo no encontrado en ruta {file_path.absolute()}",
        )
    try:
        data = pd.read_csv(file_path)
        data = data.to_dict(orient="records")
        for row in data:
            row.pop("rating", None)
        db.bulk_insert_mappings(CourseModel, data)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error ${str(e)}") from e


def get_course_detail(db: Session, course_id: int):
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def update_course(db: Session, course_id: int, payload: CourseUpdateSchema):
    course = get_course_detail(db, course_id)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(course, k, v)
    db.add(course)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e
    db.refresh(course)
    return course


def delete_course(db: Session, course_id: int) -> None:
    course = get_course_detail(db, course_id)
    try:
        db.delete(course)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e


def create_course(
    db: Session,
    payload: CourseCreateSchema,
    instructor_id: int | None,
):
    data = payload.model_dump(exclude_unset=True)
    data.pop("instructor_id", None)
    url_raw = data.pop("url", None)
    url = (url_raw or "").strip()
    if "difficulty" not in data:
        data["difficulty"] = Difficulty.INTERMEDIATE
    course = CourseModel(**data, url=url or "", instructor_id=instructor_id)
    db.add(course)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") from e
    db.refresh(course)
    return course
