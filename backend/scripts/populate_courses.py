"""Import courses from the Kaggle CSV (development)."""

from core.database import SessionLocal
from modules.courses.service import populate_courses


def main() -> None:
    db = SessionLocal()
    try:
        populate_courses(db)
        print("Courses populated successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
