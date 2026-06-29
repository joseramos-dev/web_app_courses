import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

_BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
ENABLE_DEV_ROUTES = _parse_bool(
    os.getenv("ENABLE_DEV_ROUTES"),
    default=ENVIRONMENT != "production",
)

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS")
    if not raw:
        return DEFAULT_CORS_ORIGINS
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _resolve_upload_dir() -> Path:
    raw = os.getenv("UPLOAD_DIR", "uploads/")
    path = Path(raw)
    if not path.is_absolute():
        path = _BACKEND_ROOT / path
    return path.resolve()


UPLOAD_DIR = _resolve_upload_dir()
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
ALLOWED_UPLOAD_MIMES = frozenset(
    mime.strip()
    for mime in os.getenv("ALLOWED_UPLOAD_MIMES", "application/pdf").split(",")
    if mime.strip()
)
