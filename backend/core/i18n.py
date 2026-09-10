"""Internationalization helpers for API error and success messages."""

from __future__ import annotations

from contextvars import ContextVar
from typing import Any

from fastapi import HTTPException

SUPPORTED_LANGUAGES = ("es", "en")
DEFAULT_LANGUAGE = "es"

_current_language: ContextVar[str] = ContextVar("current_language", default=DEFAULT_LANGUAGE)

# Stable codes for frontend interceptors (X-Error-Code header).
ERROR_CODES = {
    "invalid_credentials": "INVALID_CREDENTIALS",
    "invalid_current_password": "INVALID_CURRENT_PASSWORD",
}

MESSAGES: dict[str, dict[str, str]] = {
    "user_not_found": {
        "es": "Usuario no encontrado",
        "en": "User not found",
    },
    "invalid_credentials": {
        "es": "Credenciales inválidas",
        "en": "Invalid credentials",
    },
    "invalid_token": {
        "es": "Token inválido",
        "en": "Invalid token",
    },
    "could_not_validate_credentials": {
        "es": "No se pudieron validar las credenciales",
        "en": "Could not validate credentials",
    },
    "invalid_refresh_token": {
        "es": "Token de refresco inválido",
        "en": "Invalid refresh token",
    },
    "refresh_token_expired": {
        "es": "Token de refresco expirado",
        "en": "Refresh token expired",
    },
    "account_locked": {
        "es": "Cuenta bloqueada temporalmente por demasiados intentos fallidos de inicio de sesión. Inténtalo de nuevo en {minutes} minuto(s).",
        "en": "Account temporarily locked due to too many failed login attempts. Try again in {minutes} minute(s).",
    },
    "insufficient_privileges": {
        "es": "No tienes privilegios suficientes",
        "en": "You haven't enough privileges",
    },
    "course_not_found": {
        "es": "Curso no encontrado",
        "en": "Course not found",
    },
    "lesson_not_found": {
        "es": "Lección no encontrada",
        "en": "Lesson not found",
    },
    "file_not_found": {
        "es": "Archivo no encontrado",
        "en": "File not found",
    },
    "file_not_found_on_disk": {
        "es": "Archivo no encontrado en disco",
        "en": "File not found on disk",
    },
    "question_not_found": {
        "es": "Pregunta no encontrada",
        "en": "Question not found",
    },
    "enrollment_not_found": {
        "es": "Matrícula no encontrada",
        "en": "Enrollment not found",
    },
    "instructor_not_found": {
        "es": "Instructor no encontrado",
        "en": "Instructor not found",
    },
    "submission_not_found": {
        "es": "Entrega no encontrada",
        "en": "Submission not found",
    },
    "not_enrolled": {
        "es": "No estás matriculado en este curso",
        "en": "Not enrolled in this course",
    },
    "not_enrolled_in_course": {
        "es": "No estás matriculado en este curso",
        "en": "You are not enrolled in this course",
    },
    "must_enroll_first": {
        "es": "Debes matricularte en el curso primero",
        "en": "You must enroll in the course first",
    },
    "submission_file_forbidden": {
        "es": "Solo puedes acceder a tus propias entregas",
        "en": "You can only access your own submissions",
    },
    "test_needs_one_correct": {
        "es": "Una pregunta de tipo test debe tener exactamente una opcion correcta",
        "en": "A test question must have exactly one correct option",
    },
    "multiple_needs_two_correct": {
        "es": "Una pregunta de seleccion multiple debe tener al menos dos opciones correctas",
        "en": "A multiple-selection question must have at least two correct options",
    },
    "question_needs_correct_option": {
        "es": "La pregunta debe tener al menos una opcion correcta",
        "en": "The question must have at least one correct option",
    },
    "mime_content_mismatch": {
        "es": "El contenido del fichero no corresponde a un {mime_type} válido",
        "en": "The file content is not a valid {mime_type}",
    },
    "only_students_enroll": {
        "es": "Solo los estudiantes pueden matricularse en cursos",
        "en": "Only students can enroll in courses",
    },
    "only_students_complete_enrollment": {
        "es": "Solo los estudiantes pueden completar matrículas de esta forma",
        "en": "Only students can complete enrollments this way",
    },
    "enrollment_not_active": {
        "es": "La matrícula no está activa; vuelve a matricularte primero.",
        "en": "Enrollment is not active; enroll again first.",
    },
    "course_has_lessons": {
        "es": "Este curso tiene lecciones; complétalas lección a lección.",
        "en": "This course has lessons; complete them through each lesson.",
    },
    "cannot_register_admin": {
        "es": "No se puede registrar como administrador",
        "en": "Cannot register as admin",
    },
    "user_already_exists": {
        "es": "El usuario ya existe",
        "en": "User already exists",
    },
    "email_already_exists": {
        "es": "El email ya existe",
        "en": "Email already exists",
    },
    "db_error_add_user": {
        "es": "Error de base de datos al añadir un usuario",
        "en": "Database error when adding a user",
    },
    "db_error_delete_user": {
        "es": "Error de base de datos al eliminar un usuario",
        "en": "Database error when deleting a user",
    },
    "current_password_required": {
        "es": "Se requiere la contraseña actual para cambiar el email o la contraseña",
        "en": "Current password is required to change email or password",
    },
    "invalid_current_password": {
        "es": "Contraseña actual incorrecta",
        "en": "Invalid current password",
    },
    "name_cannot_be_empty": {
        "es": "El nombre no puede estar vacío",
        "en": "Name cannot be empty",
    },
    "name_already_taken": {
        "es": "El nombre ya está en uso",
        "en": "Name already taken",
    },
    "email_cannot_be_empty": {
        "es": "El email no puede estar vacío",
        "en": "Email cannot be empty",
    },
    "email_already_taken": {
        "es": "El email ya está en uso",
        "en": "Email already taken",
    },
    "password_min_length": {
        "es": "La nueva contraseña debe tener al menos 6 caracteres",
        "en": "New password must be at least 6 characters",
    },
    "could_not_update_profile": {
        "es": "No se pudo actualizar el perfil",
        "en": "Could not update profile",
    },
    "db_error_update_role": {
        "es": "Error de base de datos al actualizar el rol del usuario",
        "en": "Database error when updating user role",
    },
    "cannot_change_own_role": {
        "es": "No puedes cambiar tu propio rol",
        "en": "You cannot change your own role",
    },
    "cannot_delete_self": {
        "es": "No puedes eliminar tu propia cuenta",
        "en": "Cannot delete your own account",
    },
    "admin_already_exists": {
        "es": "Ya existe un administrador; usa PATCH /users/{user_id}/role/{role}",
        "en": "Admin already exists; use PATCH /users/{user_id}/role/{role}",
    },
    "only_students_rate": {
        "es": "Solo los estudiantes pueden valorar cursos",
        "en": "Only students can rate courses",
    },
    "must_enroll_to_rate": {
        "es": "Debes estar matriculado en este curso para valorarlo",
        "en": "Must be enrolled in this course to rate",
    },
    "only_students_view_rating": {
        "es": "Solo los estudiantes pueden ver su valoración",
        "en": "Only students can view their rating",
    },
    "must_enroll": {
        "es": "Debes estar matriculado en este curso",
        "en": "Must be enrolled in this course",
    },
    "no_rating_submitted": {
        "es": "Aún no has enviado una valoración",
        "en": "No rating submitted yet",
    },
    "only_admins_reassign_instructor": {
        "es": "Solo los administradores pueden reasignar el instructor de un curso",
        "en": "Only admins can reassign a course's instructor",
    },
    "user_not_instructor": {
        "es": "El usuario {user_id} no es instructor",
        "en": "User {user_id} is not an instructor",
    },
    "invalid_lesson_ids_reorder": {
        "es": "IDs de lección inválidos para reordenar",
        "en": "Invalid lesson ids for reorder",
    },
    "no_manage_permission": {
        "es": "No tienes permiso para gestionar este curso",
        "en": "You don't have permission to manage this course",
    },
    "complete_lesson_before_rating": {
        "es": "Completa al menos una lección antes de valorar este curso.",
        "en": "Complete at least one lesson before rating this course.",
    },
    "no_progress_for_lesson": {
        "es": "No hay progreso para esta lección",
        "en": "No progress for this lesson",
    },
    "attempt_history_test_only": {
        "es": "El historial de intentos solo está disponible para lecciones de test",
        "en": "Attempt history is only available for test lessons",
    },
    "lesson_not_assignment": {
        "es": "Esta lección no es una tarea",
        "en": "This lesson is not an assignment",
    },
    "invalid_submission_file": {
        "es": "Archivo inválido para esta entrega",
        "en": "Invalid file for this submission",
    },
    "submission_requires_content": {
        "es": "La entrega debe incluir texto o un archivo",
        "en": "Submission must include text or a file",
    },
    "file_submissions_not_allowed": {
        "es": "No se permiten entregas con archivo para esta tarea",
        "en": "File submissions are not allowed for this assignment",
    },
    "assignment_already_graded": {
        "es": "Esta tarea ya ha sido calificada",
        "en": "This assignment has already been graded",
    },
    "no_submission_for_lesson": {
        "es": "No hay entrega para esta lección",
        "en": "No submission for this lesson",
    },
    "score_exceeds_max": {
        "es": "La nota no puede superar la puntuación máxima ({max_score})",
        "en": "Score cannot exceed max_score ({max_score})",
    },
    "empty_file": {
        "es": "Archivo vacío",
        "en": "Empty file",
    },
    "file_too_large": {
        "es": "El archivo supera el tamaño máximo de {max_bytes} bytes",
        "en": "File exceeds maximum size of {max_bytes} bytes",
    },
    "mime_not_allowed": {
        "es": "Tipo MIME no permitido: {mime_type}",
        "en": "MIME type not allowed: {mime_type}",
    },
    "file_upload_assignment_only": {
        "es": "Las subidas de archivos solo están permitidas en lecciones de tarea",
        "en": "File uploads are only allowed for assignment lessons",
    },
    "invalid_filename": {
        "es": "Nombre de archivo inválido",
        "en": "Invalid filename",
    },
    "file_not_found_path": {
        "es": "Archivo no encontrado en ruta {path}",
        "en": "File not found at path {path}",
    },
    "database_error": {
        "es": "Error de base de datos: {error}",
        "en": "Database error: {error}",
    },
    "could_not_update_preferences": {
        "es": "No se pudieron actualizar las preferencias de recomendación: {error}",
        "en": "Could not update recommendation preferences: {error}",
    },
    "user_deleted": {
        "es": "Usuario {name} eliminado",
        "en": "User {name} deleted",
    },
    "user_promoted_admin": {
        "es": "Usuario existente promovido a administrador",
        "en": "Existing user promoted to admin",
    },
    "admin_user_exists": {
        "es": "El usuario administrador ya existe",
        "en": "Admin user already exists",
    },
    "admin_user_created": {
        "es": "Usuario administrador creado",
        "en": "Admin user created",
    },
    "lesson_deleted": {
        "es": "Lección eliminada",
        "en": "Lesson deleted",
    },
    "file_deleted": {
        "es": "Archivo eliminado",
        "en": "File deleted",
    },
    "question_deleted": {
        "es": "Pregunta eliminada",
        "en": "Question deleted",
    },
    "course_deleted": {
        "es": "Curso eliminado",
        "en": "Course deleted",
    },
    "notification_not_found": {
        "es": "Notificación no encontrada",
        "en": "Notification not found",
    },
    "notification_submission_title": {
        "es": "Nueva entrega",
        "en": "New submission",
    },
    "notification_submission_body": {
        "es": "{student_name} ha entregado la lección «{lesson_title}»",
        "en": "{student_name} submitted lesson «{lesson_title}»",
    },
    "notification_grade_title": {
        "es": "Entrega calificada",
        "en": "Submission graded",
    },
    "notification_grade_body": {
        "es": "Tu entrega de «{lesson_title}» ha sido calificada con {score}",
        "en": "Your submission for «{lesson_title}» was graded with {score}",
    },
    "notification_grade_returned_title": {
        "es": "Entrega devuelta",
        "en": "Submission returned",
    },
    "notification_grade_returned_body": {
        "es": "Tu entrega de «{lesson_title}» ha sido devuelta (nota: {score})",
        "en": "Your submission for «{lesson_title}» was returned (score: {score})",
    },
    "notification_new_lesson_title": {
        "es": "Nueva lección disponible",
        "en": "New lesson available",
    },
    "notification_new_lesson_body": {
        "es": "Se ha añadido «{lesson_title}» al curso «{course_title}»",
        "en": "«{lesson_title}» was added to course «{course_title}»",
    },
    "notification_lesson_removed_title": {
        "es": "Lección eliminada",
        "en": "Lesson removed",
    },
    "notification_lesson_removed_body": {
        "es": "Se ha eliminado «{lesson_title}» del curso «{course_title}»",
        "en": "«{lesson_title}» was removed from course «{course_title}»",
    },
    "notification_course_public_title": {
        "es": "Curso ahora es público",
        "en": "Course is now public",
    },
    "notification_course_public_body": {
        "es": "El curso «{course_title}» ya es visible en el catálogo.",
        "en": "Course «{course_title}» is now visible in the catalog.",
    },
    "notification_course_private_title": {
        "es": "Curso ahora es privado",
        "en": "Course is now private",
    },
    "notification_course_private_body": {
        "es": "El curso «{course_title}» ya no aparece en el catálogo público.",
        "en": "Course «{course_title}» is no longer listed in the public catalog.",
    },
    "topic_not_found": {
        "es": "Tema no encontrado",
        "en": "Topic not found",
    },
    "topic_not_empty": {
        "es": "No se puede borrar un tema que contiene lecciones",
        "en": "Cannot delete a topic that contains lessons",
    },
    "topic_deleted": {
        "es": "Tema eliminado",
        "en": "Topic deleted",
    },
    "lesson_locked": {
        "es": "Esta lección está bloqueada. Completa la lección anterior.",
        "en": "This lesson is locked. Complete the previous lesson first.",
    },
    "password_reset_requested": {
        "es": "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
        "en": "If the email exists, you will receive a link to reset your password.",
    },
    "password_reset_success": {
        "es": "Contraseña restablecida correctamente.",
        "en": "Password reset successfully.",
    },
    "reset_token_invalid": {
        "es": "El enlace de restablecimiento no es válido.",
        "en": "The reset link is not valid.",
    },
    "reset_token_expired": {
        "es": "El enlace de restablecimiento ha caducado.",
        "en": "The reset link has expired.",
    },
    "password_too_short": {
        "es": "La contraseña debe tener al menos {min_length} caracteres.",
        "en": "Password must be at least {min_length} characters.",
    },
}


def parse_accept_language(header: str | None) -> str:
    if not header:
        return DEFAULT_LANGUAGE
    for part in header.split(","):
        token = part.strip().split(";")[0].lower()
        if not token:
            continue
        lang = token.split("-")[0]
        if lang in SUPPORTED_LANGUAGES:
            return lang
    return DEFAULT_LANGUAGE


def set_language(lang: str) -> None:
    _current_language.set(lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE)


def get_language() -> str:
    return _current_language.get()


def msg(key: str, **params: Any) -> str:
    entry = MESSAGES.get(key)
    if entry is None:
        return key
    lang = get_language()
    template = entry.get(lang) or entry.get(DEFAULT_LANGUAGE) or key
    if params:
        try:
            return template.format(**params)
        except (KeyError, ValueError):
            return template
    return template


def http_error(
    status_code: int,
    key: str,
    *,
    error_code: str | None = None,
    headers: dict[str, str] | None = None,
    **params: Any,
) -> HTTPException:
    merged_headers = dict(headers or {})
    if error_code:
        merged_headers["X-Error-Code"] = error_code
    return HTTPException(
        status_code=status_code,
        detail=msg(key, **params),
        headers=merged_headers or None,
    )
