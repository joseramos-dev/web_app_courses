from dotenv import load_dotenv

from sqlalchemy.orm import Session
from modules.users.model import UserModel, UserRole
from core.security import hash_password, verify_password
from modules.users.schema import UserCreateSchema, UserSelfUpdateSchema
from modules.recommendations.service import create_default_recommendation
from core.i18n import ERROR_CODES, http_error, msg

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


def count_admins(db: Session) -> int:
    return (
        db.query(UserModel)
        .filter(UserModel.role == UserRole.ADMIN)
        .count()
    )


## ACTION FUNCTIONS
def add_user_database(db: Session, user_sch: UserCreateSchema) -> UserModel:
    """
    Handles ONLY the database interaction.
    Accepts a prepared Model, not a Schema.
    """
    if user_sch.role == UserRole.ADMIN:
        raise http_error(403, "cannot_register_admin")
    try:
        user = UserModel(
            name=user_sch.name,
            email=user_sch.email,
            role=user_sch.role,
            hash_password=hash_password(user_sch.password),
        )
        db.add(user)
        db.flush()
        create_default_recommendation(db, user.id)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        if(check_name_exists(db,user.name)):
            raise http_error(409, "user_already_exists")
        elif(check_email_exists(db,user.email)):
            raise http_error(409, "email_already_exists")
        else:
            raise http_error(500, "db_error_add_user")


def delete_user_database(db: Session, user_id: int):
    user = get_user(db, user_id)
    if not user:
        raise http_error(404, "user_not_found")
    try:
        db.delete(user)
        db.commit()
        return {"detail": msg("user_deleted", name=user.name)}
    except Exception:
        db.rollback()
        raise http_error(500, "db_error_delete_user")


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
            raise http_error(400, "current_password_required")
        if not verify_password(data.current_password, user.hash_password):
            raise http_error(
                401,
                "invalid_current_password",
                error_code=ERROR_CODES["invalid_current_password"],
            )

    if data.name is not None:
        name = data.name.strip()
        if not name:
            raise http_error(400, "name_cannot_be_empty")
        if name != user.name:
            taken = (
                db.query(UserModel)
                .filter(UserModel.name == name, UserModel.id != user.id)
                .first()
            )
            if taken:
                raise http_error(409, "name_already_taken")
            user.name = name

    if data.email is not None:
        email = data.email.strip()
        if not email:
            raise http_error(400, "email_cannot_be_empty")
        if email != user.email:
            taken = (
                db.query(UserModel)
                .filter(UserModel.email == email, UserModel.id != user.id)
                .first()
            )
            if taken:
                raise http_error(409, "email_already_taken")
            user.email = email

    if password_change:
        pwd = data.new_password.strip()
        if len(pwd) < 6:
            raise http_error(400, "password_min_length")
        user.hash_password = hash_password(pwd)

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise http_error(500, "could_not_update_profile")


def update_user_role_database(db: Session, user_id: int, role: UserRole) -> UserModel:
    user = get_user(db, user_id)
    if not user:
        raise http_error(404, "user_not_found")
    try:
        user.role = role
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise http_error(500, "db_error_update_role")


def create_bootstrap_admin(db: Session) -> dict:
    """Create default admin user (development bootstrap). Idempotent if admin exists."""
    existing = check_name_exists(db, "admin") or check_email_exists(db, "admin@admin")
    if existing:
        if existing.role != UserRole.ADMIN:
            existing.role = UserRole.ADMIN
            db.commit()
            db.refresh(existing)
            return {"detail": msg("user_promoted_admin"), "user_id": existing.id}
        return {"detail": msg("admin_user_exists"), "user_id": existing.id}

    user = UserModel(
        name="admin",
        email="admin@admin",
        role=UserRole.ADMIN,
        hash_password=hash_password("admin"),
    )
    db.add(user)
    db.flush()
    create_default_recommendation(db, user.id)
    db.commit()
    db.refresh(user)
    return {"detail": msg("admin_user_created"), "user_id": user.id}
