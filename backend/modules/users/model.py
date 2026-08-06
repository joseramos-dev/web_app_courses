import enum
from sqlalchemy import Column, DateTime, Enum as SqlEnum, Integer, String, Text
from sqlalchemy.sql.functions import now

from core.database import Base

class UserRole(str, enum.Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"

class UserModel(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False, unique=True)
    email = Column(String, nullable=False, unique=True)
    hash_password = Column(Text, nullable=False)
    role = Column(SqlEnum(UserRole), nullable=False)
    time_creation = Column(DateTime(timezone=True), server_default=now())

    # Login lockout tracking (reset on successful login).
    failed_login_attempts = Column(Integer, nullable=False, default=0, server_default="0")
    locked_until = Column(DateTime(timezone=True), nullable=True)


