# main.py
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

from core.config import ENABLE_DEV_ROUTES, get_allowed_hosts, get_cors_origins
from core.i18n_middleware import I18nMiddleware
from core.rate_limit import limiter
from core.security_middleware import (
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
)
from modules.auth.routes import auth_router
from modules.users.routes import users_router
from modules.courses.routes import courses_router
from modules.lessons.routes import lessons_router
from modules.enrollments.routes import enrollments_router
from modules.progress.routes import progress_router
from modules.dashboard.routes import dashboard_router
from modules.recommendations.routes import recommendations_router
from modules.notifications.routes import notifications_router
from modules.topics.routes import topics_router

app = FastAPI()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middlewares run outermost-last: the ones added last see the request first.
# The size limit must reject before anything reads the body, and the security
# headers must be applied to every response, error pages included.
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(I18nMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=get_allowed_hosts())
app.add_middleware(RequestSizeLimitMiddleware)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(courses_router)
app.include_router(lessons_router)
app.include_router(enrollments_router)
app.include_router(progress_router)
app.include_router(dashboard_router)
app.include_router(recommendations_router)
app.include_router(notifications_router)
app.include_router(topics_router)

if ENABLE_DEV_ROUTES:
    from modules.dev.routes import dev_router

    app.include_router(dev_router)


@app.get("/", status_code=status.HTTP_200_OK)
def read_root():
    return {"status": "ok"}
