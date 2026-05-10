from enum import Enum

from fastapi import Depends, HTTPException, Query

from modules.courses.model import CourseModel
from modules.auth.service import get_current_user

from pydantic import BaseModel


def require_role(required_roles: list[str]):
    def role_checker(user=Depends(get_current_user)):
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.role not in required_roles:
            raise HTTPException(status_code=403, detail="You haven't enough privileges")
        return user

    return role_checker


class OrderEnum(str, Enum):
    asc = "asc"
    desc = "desc"


class SortField(str, Enum):
    title = "title"
    duration = "duration_seconds"
    rating = "rating"
    created_at = "created_at"


class PaginationParams(BaseModel):
    limit: int = 100
    offset: int = 0
    sort_by: SortField = Query(SortField.title)
    order: OrderEnum = Query(OrderEnum.desc)


def sort_map_column(sortField: SortField):
    dict = {
        SortField.title: CourseModel.title,
        SortField.duration: CourseModel.duration_seconds,
        SortField.rating: CourseModel.rating,
        SortField.created_at: CourseModel.created_at,
    }
    return dict[sortField]


def get_pagination(
    limit: int = Query(100, ge=0),
    offset: int = Query(0, ge=0),
    sort_by: SortField = Query(SortField.title),
    order: OrderEnum = Query(OrderEnum.desc),
) -> PaginationParams:
    return PaginationParams(limit=limit, offset=offset, sort_by=sort_by, order=order)
