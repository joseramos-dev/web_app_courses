from dotenv import load_dotenv
from fastapi import HTTPException

from sqlalchemy.orm import Session
from modules.users.model import UserModel
from core.security import hash_password
from modules.users.schema import UserCreateSchema

load_dotenv()


def get_user(db: Session, id: int):
    return db.query(UserModel).filter(UserModel.id == id).first()


def get_all_users(db: Session):
    return db.query(UserModel).all()

def check_name_exists(db: Session, name:str):
    return db.query(UserModel).filter(UserModel.name == name).first()

def check_email_exists(db: Session, email:str):
    return db.query(UserModel).filter(UserModel.email == email).first()



## ACTION FUNCTIONS
def add_user_database(db: Session, user_sch: UserCreateSchema) -> UserModel:
    """
    Handles ONLY the database interaction.
    Accepts a prepared Model, not a Schema.
    """
    try:
        user = UserModel(
            name=user_sch.name,
            email=user_sch.email,
            role=user_sch.role,
            hash_password=hash_password(user_sch.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        if(check_name_exists(db,user.name)):
            raise HTTPException(status_code=409, detail="User already exists")
        elif(check_email_exists(db,user.email)):
            raise HTTPException(status_code=409, detail="Email already exists")
        else:
            raise HTTPException(status_code=500, detail="Database error when adding a user")
