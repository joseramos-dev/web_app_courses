import os

from dotenv import load_dotenv
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine

from core.config import DB_MAX_OVERFLOW, DB_POOL_RECYCLE, DB_POOL_SIZE

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

# SQLite does not use a QueuePool, so these arguments are invalid there.
_pool_options = (
    {}
    if DATABASE_URL.startswith("sqlite")
    else {
        "pool_size": DB_POOL_SIZE,
        "max_overflow": DB_MAX_OVERFLOW,
        # Drops connections the server closed behind our back instead of
        # handing a dead one to the next request.
        "pool_pre_ping": True,
        "pool_recycle": DB_POOL_RECYCLE,
    }
)

engine = create_engine(DATABASE_URL, **_pool_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()