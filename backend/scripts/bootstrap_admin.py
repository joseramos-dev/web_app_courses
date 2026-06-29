"""Bootstrap the default admin user (development / first deploy)."""

from core.database import SessionLocal
from modules.users.service import create_bootstrap_admin


def main() -> None:
    db = SessionLocal()
    try:
        result = create_bootstrap_admin(db)
        print(result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
