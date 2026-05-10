from dotenv import load_dotenv
from fastapi import HTTPException

from sqlalchemy.orm import Session
from modules.users.model import UserModel, UserRole
from core.security import hash_password, verify_password
from modules.users.schema import UserCreateSchema, UserSelfUpdateSchema

load_dotenv()


def get_user(db: Session, id: int):
    return db.query(UserModel).filter(UserModel.id == id).first()


def get_all_users(db: Session, role: UserRole | None = None):
    """
    List users, optionally filtered by role. Used by the admin panel
    (no filter) and by the course editor to populate the instructor picker
    (role=instructor).
    """
    query = db.query(UserModel)
    if role is not None:
        query = query.filter(UserModel.role == role)
    return query.order_by(UserModel.role.desc(), UserModel.name.asc()).all()

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


def delete_user_database(db: Session, user_id: int):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        db.delete(user)
        db.commit()
        return {"detail": f"User {user.name} deleted"}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error when deleting a user")


def update_self_user(
    db: Session, user: UserModel, data: UserSelfUpdateSchema
) -> UserModel:
    """Update name, email, and/or password for the authenticated user."""
    email_changed = (
        data.email is not None
        and data.email.strip() != ""
        and data.email.strip() != user.email
    )
    password_change = (
        data.new_password is not None and data.new_password.strip() != ""
    )

    if email_changed or password_change:
        if not data.current_password:
            raise HTTPException(
                status_code=400,
                detail="Current password is required to change email or password",
            )
        if not verify_password(data.current_password, user.hash_password):
            raise HTTPException(status_code=401, detail="Invalid current password")

    if data.name is not None:
        name = data.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        if name != user.name:
            taken = (
                db.query(UserModel)
                .filter(UserModel.name == name, UserModel.id != user.id)
                .first()
            )
            if taken:
                raise HTTPException(status_code=409, detail="Name already taken")
            user.name = name

    if data.email is not None:
        email = data.email.strip()
        if not email:
            raise HTTPException(status_code=400, detail="Email cannot be empty")
        if email != user.email:
            taken = (
                db.query(UserModel)
                .filter(UserModel.email == email, UserModel.id != user.id)
                .first()
            )
            if taken:
                raise HTTPException(status_code=409, detail="Email already taken")
            user.email = email

    if password_change:
        pwd = data.new_password.strip()
        if len(pwd) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters",
            )
        user.hash_password = hash_password(pwd)

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not update profile")


def update_user_role_database(db: Session, user_id: int, role: UserRole) -> UserModel:
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        user.role = role
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error when updating user role")
