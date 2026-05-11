# Quick start for reviewers

Thanks for taking a look. This is the shortest path from a fresh clone to a running app.

## Prerequisites

- **Git**
- Either **Docker Desktop** (recommended for one command), or **Python 3.12+** with [**uv**](https://docs.astral.sh/uv/), **Node.js** (current LTS is fine), and **PostgreSQL** (e.g. 16) if you run services locally.

## Clone

```bash
git clone <repository-url>
cd TFG
```

(Use the folder name you cloned into if it is not `TFG`.)

## Configuration / secrets

- **Docker path:** copy `docker/.env.example` to `docker/.env`, set a long random `SECRET_KEY`, and keep `DATABASE_URL` aligned with the Postgres user/password/database you define. Step-by-step (Spanish): [docker/ComoUsarDocker.txt](../docker/ComoUsarDocker.txt).
- **Local backend:** create `backend/.env` with at least `DATABASE_URL` and `SECRET_KEY` (same semantics as in `docker/.env.example`). If Postgres runs on your machine (not inside Compose), use host `localhost` and port `5432` in `DATABASE_URL`, not `db`.

The frontend calls the API at `http://localhost:8000` (see `frontend/src/shared/api/api.tsx`); no separate frontend env file is required for the default setup.

## Install

```bash
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..
```

## Run

**Option A — Docker (db + backend + frontend):** from the `docker` folder, `docker compose up --build`. First run can take a while.

**Option B — Local:** start Postgres, apply migrations from `backend` (`uv run alembic upgrade head`), then `uv run uvicorn main:app --reload` (still from `backend`). In another terminal, from `frontend`, run `npm run dev`.

## URLs

| What        | URL                          |
| ----------- | ---------------------------- |
| Frontend    | http://localhost:5173        |
| API root    | http://localhost:8000        |
| OpenAPI UI  | http://localhost:8000/docs   |
| ReDoc       | http://localhost:8000/redoc  |

Interactive API testing is easiest via **Swagger** at `/docs`.

## Accounts and data

There is **no bundled seed script**. Use the app’s **registration** flow in the UI to create a user.

For development only, the backend exposes `POST /users/create_admin`, which creates an admin user (`admin` / `admin@admin` / password `admin`). It is marked for removal in `backend/modules/users/routes.py`; do not use in production.

---

The template text in [frontend/README.md](../frontend/README.md) is generic Vite boilerplate, not project-specific run instructions.
