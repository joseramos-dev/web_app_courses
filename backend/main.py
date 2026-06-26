# main.py
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from modules.auth.routes import auth_router
from modules.users.routes import users_router
from modules.courses.routes import courses_router
from modules.lessons.routes import lessons_router
from modules.enrollments.routes import enrollments_router
from modules.progress.routes import progress_router
from modules.dashboard.routes import dashboard_router
from modules.recommendations.routes import recommendations_router

# To run the server -> uv run uvicorn main:app --reload
# To access other devices -> uv run uvicorn main:app --host 0.0.0.0 --port 8000
#  From other devices search -> 192.168.1.x:8000

# To use alembic:
# To create a new migration -> alembic revision --autogenerate -m "add age column to users"
# To apply the migration -> alembic upgrade head

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#deleted since alembic is used to manage the database
#Base.metadata.create_all(bind=engine)

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
