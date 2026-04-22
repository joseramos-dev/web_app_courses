# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import Base, engine

from modules.auth.routes import auth_router
from modules.users.routes import users_router


# para ejecutar -> uv run uvicorn main:app --reload
# acceder otros dispositivos -> uv run uvicorn main:app --host 0.0.0.0 --port 8000
#  desde otro dispositivos buscas -> 192.168.1.x:8000

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

Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(users_router)


@app.get("/")
def read_root():
    return {"status": "ok"}
