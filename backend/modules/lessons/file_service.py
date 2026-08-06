import uuid
from pathlib import Path

from fastapi import UploadFile, status
from sqlalchemy import event
from sqlalchemy.orm import Session

from core.config import ALLOWED_UPLOAD_MIMES, MAX_UPLOAD_BYTES, UPLOAD_DIR
from core.i18n import http_error
from modules.courses.service import get_course_detail
from modules.enrollments.model import EnrollmentModel
from modules.lessons.model import LessonFileModel, LessonModel, LessonType


def _is_course_editor(user, course) -> bool:
    return user.role == "admin" or (
        course.instructor_id is not None and user.id == course.instructor_id
    )


def _require_course_editor(db: Session, user, lesson: LessonModel):
    course = get_course_detail(db, lesson.course_id)
    if not _is_course_editor(user, course):
        raise http_error(
            status.HTTP_403_FORBIDDEN,
            "insufficient_privileges",
        )
    return course


def require_course_access(db: Session, user, lesson: LessonModel):
    course = get_course_detail(db, lesson.course_id)
    if _is_course_editor(user, course):
        return course
    enrolled = (
        db.query(EnrollmentModel)
        .filter(
            EnrollmentModel.user_id == user.id,
            EnrollmentModel.course_id == lesson.course_id,
        )
        .first()
    )
    if not enrolled:
        raise http_error(
            status.HTTP_403_FORBIDDEN,
            "must_enroll_first",
        )
    return course


def _safe_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext and len(ext) <= 10 and ext.replace(".", "").isalnum():
        return ext
    return ""


def _storage_path(storage_name: str) -> Path:
    return UPLOAD_DIR / storage_name


def _ensure_upload_dir() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _remove_storage_file(storage_name: str) -> None:
    path = _storage_path(storage_name)
    if path.is_file():
        path.unlink()


def validate_upload(file: UploadFile, content: bytes) -> str:
    if not content:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            "empty_file",
        )
    if len(content) > MAX_UPLOAD_BYTES:
        raise http_error(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "file_too_large",
            max_bytes=MAX_UPLOAD_BYTES,
        )

    mime_type = (file.content_type or "").split(";")[0].strip().lower()
    if mime_type not in ALLOWED_UPLOAD_MIMES:
        raise http_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "mime_not_allowed",
            mime_type=mime_type or "unknown",
        )
    return mime_type


def get_file_by_id(db: Session, file_id: int) -> LessonFileModel | None:
    return db.query(LessonFileModel).filter(LessonFileModel.id == file_id).first()


def list_lesson_files(db: Session, lesson_id: int) -> list[LessonFileModel]:
    return (
        db.query(LessonFileModel)
        .filter(LessonFileModel.lesson_id == lesson_id)
        .order_by(LessonFileModel.uploaded_at.asc())
        .all()
    )


async def save_lesson_file(
    db: Session,
    lesson: LessonModel,
    user,
    file: UploadFile,
) -> LessonFileModel:
    _require_course_editor(db, user, lesson)

    return await _persist_upload(db, lesson, user, file)


async def save_submission_file(
    db: Session,
    lesson: LessonModel,
    user,
    file: UploadFile,
) -> LessonFileModel:
    if lesson.lesson_type != LessonType.ASSIGNMENT:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            "file_upload_assignment_only",
        )
    require_course_access(db, user, lesson)
    return await _persist_upload(db, lesson, user, file)


async def _persist_upload(
    db: Session,
    lesson: LessonModel,
    user,
    file: UploadFile,
) -> LessonFileModel:
    original_filename = Path(file.filename or "upload").name
    if not original_filename or original_filename in {".", ".."}:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            "invalid_filename",
        )

    content = await file.read()
    mime_type = validate_upload(file, content)

    ext = _safe_extension(original_filename)
    storage_name = f"{uuid.uuid4().hex}{ext}"

    _ensure_upload_dir()
    destination = _storage_path(storage_name)
    with destination.open("wb") as out:
        out.write(content)

    record = LessonFileModel(
        lesson_id=lesson.id,
        original_filename=original_filename,
        storage_name=storage_name,
        mime_type=mime_type,
        size_bytes=len(content),
        uploaded_by=user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_download_path(
    db: Session,
    file_record: LessonFileModel,
    user,
) -> Path:
    lesson = db.query(LessonModel).filter(LessonModel.id == file_record.lesson_id).first()
    if not lesson:
        raise http_error(404, "lesson_not_found")
    require_course_access(db, user, lesson)

    path = _storage_path(file_record.storage_name)
    if not path.is_file():
        raise http_error(404, "file_not_found_on_disk")
    return path


def delete_lesson_file(db: Session, file_record: LessonFileModel, user) -> None:
    lesson = db.query(LessonModel).filter(LessonModel.id == file_record.lesson_id).first()
    if not lesson:
        raise http_error(404, "lesson_not_found")
    _require_course_editor(db, user, lesson)

    db.delete(file_record)
    db.commit()


@event.listens_for(LessonFileModel, "after_delete")
def _cleanup_storage_on_delete(_mapper, _connection, target: LessonFileModel) -> None:
    _remove_storage_file(target.storage_name)
