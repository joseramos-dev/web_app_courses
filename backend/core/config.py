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


def get_allowed_hosts() -> list[str]:
    """Host header allowlist for TrustedHostMiddleware."""
    raw = os.getenv("ALLOWED_HOSTS")
    if not raw:
        return ["*"]
    return [host.strip() for host in raw.split(",") if host.strip()]


# --- Session cookie (refresh token) ---
# Secure requires HTTPS, so it defaults off outside production to keep
# http://localhost working during development.
COOKIE_SECURE = _parse_bool(
    os.getenv("COOKIE_SECURE"),
    default=ENVIRONMENT == "production",
)
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").strip().lower()
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None

# --- Rate limiting ---
RATE_LIMIT_ENABLED = _parse_bool(os.getenv("RATE_LIMIT_ENABLED"), default=True)
RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "200/minute")

# --- Database connection pool ---
# The defaults (5 + 10) are tight for endpoints that hold a connection for
# seconds, such as the recommender.
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "20"))
DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "1800"))


def _resolve_upload_dir() -> Path:
    raw = os.getenv("UPLOAD_DIR", "uploads/")
    path = Path(raw)
    if not path.is_absolute():
        path = _BACKEND_ROOT / path
    return path.resolve()


UPLOAD_DIR = _resolve_upload_dir()
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
# Whole-request ceiling, enforced before routing. Leaves room for the
# multipart envelope on top of the largest allowed file.
MAX_REQUEST_BYTES = int(
    os.getenv("MAX_REQUEST_BYTES", str(MAX_UPLOAD_BYTES + 1024 * 1024))
)
ALLOWED_UPLOAD_MIMES = frozenset(
    mime.strip()
    for mime in os.getenv("ALLOWED_UPLOAD_MIMES", "application/pdf").split(",")
    if mime.strip()
)
