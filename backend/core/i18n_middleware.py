from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from core.i18n import parse_accept_language, set_language


class I18nMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        set_language(parse_accept_language(request.headers.get("accept-language")))
        return await call_next(request)
