"""Fill the imported catalogue with topics and lessons so the app can be exercised.

The Kaggle import only creates course cards: without lessons there is no player,
no quiz, no progress and no history for the recommender to work from.

    uv run python -m scripts.seed_demo_data

Thin wrapper: the logic lives in `modules/dev/seeding.py` so the admin
dashboard runs exactly the same code.
"""

from core.database import SessionLocal
from modules.dev.seeding import seed_missing_curricula


def main() -> None:
    db = SessionLocal()
    try:
        totals = seed_missing_curricula(db)
        if not totals["courses"]:
            print(
                "Nothing to seed: every categorised course already has a "
                "curriculum. Import more with POST /courses/populate_courses, "
                "or wipe with POST /dev/reset-database."
            )
            return
        print(
            f"Seeded {totals['courses']} courses: {totals['topics']} topics, "
            f"{totals['lessons']} lessons, {totals['questions']} questions."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
