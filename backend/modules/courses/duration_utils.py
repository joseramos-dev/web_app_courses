from sqlalchemy import or_
from sqlalchemy.orm import Query

from modules.courses.model import CourseModel, DurationBucket

TEN_HOURS_SECONDS = 10 * 3600
ONE_WEEK_SECONDS = 7 * 24 * 3600


def duration_bucket(seconds: int | None) -> DurationBucket | None:
    if seconds is None or seconds <= 0:
        return None
    if seconds < TEN_HOURS_SECONDS:
        return DurationBucket.SHORT
    if seconds <= ONE_WEEK_SECONDS:
        return DurationBucket.MEDIUM
    return DurationBucket.LONG


def duration_bucket_filter(
    query: Query, buckets: list[DurationBucket]
) -> Query:
    if not buckets:
        return query

    conditions = []
    if DurationBucket.SHORT in buckets:
        conditions.append(
            (CourseModel.duration_seconds.isnot(None))
            & (CourseModel.duration_seconds > 0)
            & (CourseModel.duration_seconds < TEN_HOURS_SECONDS)
        )
    if DurationBucket.MEDIUM in buckets:
        conditions.append(
            (CourseModel.duration_seconds.isnot(None))
            & (CourseModel.duration_seconds >= TEN_HOURS_SECONDS)
            & (CourseModel.duration_seconds <= ONE_WEEK_SECONDS)
        )
    if DurationBucket.LONG in buckets:
        conditions.append(CourseModel.duration_seconds > ONE_WEEK_SECONDS)

    if not conditions:
        return query
    return query.filter(or_(*conditions))
