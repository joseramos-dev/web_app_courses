"""Give the demo students a study history so the app has something to measure.

Without this the catalogue is full but nobody has ever studied: the recommender
has no history, the dashboards are empty and the load tests have no data-size
axis to grow along.

    uv run python -m scripts.simulate_students
    uv run python -m scripts.simulate_students --reset --seed 7

Additive by default: students who already have enrollments are left alone, so a
second run only fills in the new accounts. `--reset` wipes the demo students'
activity first and starts over.

Thin wrapper: the logic lives in `modules/dev/simulation.py`.
"""

import argparse

from core.database import SessionLocal
from modules.dev.simulation import RANDOM_SEED, reset_simulation, simulate_students


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete the demo students' enrollments, ratings and activity first.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=RANDOM_SEED,
        help=f"Random seed, so runs are reproducible (default: {RANDOM_SEED}).",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.reset:
            cleared = reset_simulation(db)
            print(
                f"Cleared {cleared['enrollments']} enrollments, "
                f"{cleared['ratings']} ratings and "
                f"{cleared['activity_days']} activity days."
            )

        totals = simulate_students(db, seed=args.seed)

        if not totals["students"]:
            print(
                "Nothing to simulate: no demo student without enrollments. "
                "Create accounts with POST /dev/seed-users, or re-run with "
                "--reset to start over."
            )
            return

        print(
            f"Simulated {totals['students']} students "
            f"({totals['skipped']} skipped, already busy):\n"
            f"  {totals['enrollments']} enrollments "
            f"({totals['completed_courses']} completed, "
            f"{totals['abandoned_courses']} abandoned on an assignment)\n"
            f"  {totals['lessons']} lessons completed\n"
            f"  {totals['attempts']} quiz attempts "
            f"({totals['failed_attempts']} failed)\n"
            f"  {totals['ratings']} ratings"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
