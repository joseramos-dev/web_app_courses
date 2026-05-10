from operator import or_
import os
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from jose import jwt, JWTError

from modules.users.model import UserModel
from modules.users.service import get_user
from core.security import oauth2_scheme
from core.database import get_db

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")


def get_user_by_name_or_email(db: Session, nameOrEmail: str):
    user = (
        db.query(UserModel)
        .filter(
            or_(
                UserModel.name == nameOrEmail,
                UserModel.email == nameOrEmail,
            )
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = int( payload.get("sub") )
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user
