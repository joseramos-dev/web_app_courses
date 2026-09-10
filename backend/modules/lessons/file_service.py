import uuid
from pathlib import Path

from fastapi import UploadFile, status
from sqlalchemy import event
from sqlalchemy.orm import Session

from core.config import ALLOWED_UPLOAD_MIMES, MAX_UPLOAD_BYTES, UPLOAD_DIR
from core.i18n import http_error
from modules.courses.permissions import is_course_editor
from modules.courses.service import get_course_detail
from modules.enrollments.model import EnrollmentModel
from modules.lessons.model import LessonFileModel, LessonModel, LessonType
from modules.progress.access_service import assert_lesson_unlocked
from modules.progress.model import LessonSubmissionModel, SubmissionStatus


def _require_course_editor(db: Session, user, lesson: LessonModel):
    course = get_course_detail(db, lesson.course_id, user=user)
    if not is_course_editor(user, course):
        raise http_error(
            status.HTTP_403_FORBIDDEN,
            "insufficient_privileges",
        )
    return course


def require_course_access(db: Session, user, lesson: LessonModel):
    course = get_course_detail(db, lesson.course_id, user=user)
    if is_course_editor(user, course):
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
    assert_lesson_unlocked(db, lesson, user)
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


_UPLOAD_CHUNK_BYTES = 64 * 1024

# Leading bytes that a file of each type must actually start with. The declared
# Content-Type is attacker-controlled, so it is only a hint: a .exe renamed and
# announced as application/pdf must not get through.
#
# A MIME listed in ALLOWED_UPLOAD_MIMES but missing here is rejected: we cannot
# vouch for a format we do not know how to recognise. Extend this table to
# support a new upload type.
MAGIC_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "application/pdf": (b"%PDF-",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/gif": (b"GIF87a", b"GIF89a"),
    "image/webp": (b"RIFF",),
    "application/zip": (b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"),
}


async def read_capped(file: UploadFile) -> bytes:
    """Read the upload in chunks, aborting as soon as it exceeds the limit.

    Reading it whole first and checking the size afterwards means a huge upload
    is fully spooled to a temporary file before being rejected.
    """
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_UPLOAD_CHUNK_BYTES)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise http_error(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                "file_too_large",
                max_bytes=MAX_UPLOAD_BYTES,
            )
        chunks.append(chunk)
    return b"".join(chunks)


def validate_upload(file: UploadFile, content: bytes) -> str:
    """Validate the declared MIME against the allowlist and the real content."""
    if not content:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            "empty_file",
        )

    mime_type = (file.content_type or "").split(";")[0].strip().lower()
    if mime_type not in ALLOWED_UPLOAD_MIMES:
        raise http_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "mime_not_allowed",
            mime_type=mime_type or "unknown",
        )

    signatures = MAGIC_SIGNATURES.get(mime_type)
    if not signatures or not content.startswith(signatures):
        raise http_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "mime_content_mismatch",
            mime_type=mime_type,
        )
    return mime_type


def get_file_by_id(db: Session, file_id: int) -> LessonFileModel | None:
    return db.query(LessonFileModel).filter(LessonFileModel.id == file_id).first()


def list_lesson_files(db: Session, lesson_id: int) -> list[LessonFileModel]:
    """Course material attached to the lesson.

    Assignment submissions live in the same table but are never listed here:
    they are private to their author and the course staff, who reach them
    through the submissions panel instead.
    """
    return (
        db.query(LessonFileModel)
        .filter(
            LessonFileModel.lesson_id == lesson_id,
            LessonFileModel.is_submission.is_(False),
        )
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

    return await _persist_upload(db, lesson, user, file, is_submission=False)


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
    return await _persist_upload(db, lesson, user, file, is_submission=True)


async def _persist_upload(
    db: Session,
    lesson: LessonModel,
    user,
    file: UploadFile,
    *,
    is_submission: bool,
) -> LessonFileModel:
    original_filename = Path(file.filename or "upload").name
    if not original_filename or original_filename in {".", ".."}:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            "invalid_filename",
        )

    content = await read_capped(file)
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
        is_submission=is_submission,
        uploaded_by=user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _require_submission_access(db: Session, file_record: LessonFileModel, user, lesson):
    """A submission is readable only by the student who uploaded it and by the
    course staff. Being enrolled in the course is not enough: that would let a
    classmate read someone else's assignment."""
    if file_record.uploaded_by == user.id:
        return
    course = get_course_detail(db, lesson.course_id, user=user)
    if not is_course_editor(user, course):
        raise http_error(
            status.HTTP_403_FORBIDDEN,
            "submission_file_forbidden",
        )


def get_download_path(
    db: Session,
    file_record: LessonFileModel,
    user,
) -> Path:
    lesson = db.query(LessonModel).filter(LessonModel.id == file_record.lesson_id).first()
    if not lesson:
        raise http_error(404, "lesson_not_found")
    if file_record.is_submission:
        _require_submission_access(db, file_record, user, lesson)
    else:
        require_course_access(db, user, lesson)

    path = _storage_path(file_record.storage_name)
    if not path.is_file():
        raise http_error(404, "file_not_found_on_disk")
    return path


def delete_lesson_file(db: Session, file_record: LessonFileModel, user) -> None:
    lesson = db.query(LessonModel).filter(LessonModel.id == file_record.lesson_id).first()
    if not lesson:
        raise http_error(404, "lesson_not_found")
    if file_record.is_submission and file_record.uploaded_by == user.id:
        # Students may replace their own upload while it is still pending;
        # once it has been graded the file is part of the record.
        _require_ungraded_submission(db, file_record)
    else:
        _require_course_editor(db, user, lesson)

    db.delete(file_record)
    db.commit()


def _require_ungraded_submission(db: Session, file_record: LessonFileModel) -> None:
    submission = (
        db.query(LessonSubmissionModel)
        .filter(LessonSubmissionModel.file_id == file_record.id)
        .first()
    )
    if submission is not None and submission.status == SubmissionStatus.GRADED:
        raise http_error(
            status.HTTP_403_FORBIDDEN,
            "assignment_already_graded",
        )


@event.listens_for(LessonFileModel, "after_delete")
def _cleanup_storage_on_delete(_mapper, _connection, target: LessonFileModel) -> None:
    _remove_storage_file(target.storage_name)
