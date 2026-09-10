from sqlalchemy import or_
from sqlalchemy.orm import Query

from modules.courses.model import CourseModel, DurationBucket

# Cut points taken from the catalogue itself. The original boundaries (10 hours
# and one week) came from the Kaggle metadata, where duration was free text
# about weeks of study; now it is the sum of the lessons' own durations, so the
# seeded courses run from about 1 h to 13 h and `long` could never be reached.
# Five and ten hours split the 300 courses into 111 / 113 / 76.
FIVE_HOURS_SECONDS = 5 * 3600
TEN_HOURS_SECONDS = 10 * 3600


def duration_bucket(seconds: int | None) -> DurationBucket | None:
    if seconds is None or seconds <= 0:
        return None
    if seconds < FIVE_HOURS_SECONDS:
        return DurationBucket.SHORT
    if seconds <= TEN_HOURS_SECONDS:
        return DurationBucket.MEDIUM
    return DurationBucket.LONG


def duration_bucket_or_conditions(buckets: list[DurationBucket]) -> list:
    """The SQL equivalent of `duration_bucket`, one predicate per bucket asked for."""
    if not buckets:
        return []

    conditions = []
    if DurationBucket.SHORT in buckets:
        conditions.append(
            (CourseModel.duration_seconds.isnot(None))
            & (CourseModel.duration_seconds > 0)
            & (CourseModel.duration_seconds < FIVE_HOURS_SECONDS)
        )
    if DurationBucket.MEDIUM in buckets:
        conditions.append(
            (CourseModel.duration_seconds.isnot(None))
            & (CourseModel.duration_seconds >= FIVE_HOURS_SECONDS)
            & (CourseModel.duration_seconds <= TEN_HOURS_SECONDS)
        )
    if DurationBucket.LONG in buckets:
        conditions.append(CourseModel.duration_seconds > TEN_HOURS_SECONDS)
    return conditions


def duration_bucket_filter(query: Query, buckets: list[DurationBucket]) -> Query:
    conditions = duration_bucket_or_conditions(buckets)
    if not conditions:
        return query
    return query.filter(or_(*conditions))
