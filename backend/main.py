# main.py
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_cors_origins
from modules.auth.routes import auth_router
from modules.users.routes import users_router
from modules.courses.routes import courses_router
from modules.lessons.routes import lessons_router
from modules.enrollments.routes import enrollments_router
from modules.progress.routes import progress_router
from modules.dashboard.routes import dashboard_router
from modules.recommendations.routes import recommendations_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(courses_router)
app.include_router(lessons_router)
app.include_router(enrollments_router)
app.include_router(progress_router)
app.include_router(dashboard_router)
app.include_router(recommendations_router)


@app.get("/", status_code=status.HTTP_200_OK)
def read_root():
    return {"status": "ok"}
