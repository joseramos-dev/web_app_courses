# Inicio rápido para revisores

Gracias por echar un vistazo. Este es el camino más corto desde un clon recién hecho hasta la aplicación en ejecución.

## Requisitos previos

- **Git**
- **Docker Desktop** (recomendado para levantar todo con un solo comando), o bien **Python 3.12+** con [**uv**](https://docs.astral.sh/uv/), **Node.js** (la LTS actual vale), y **PostgreSQL** (p. ej. 16) si ejecutas los servicios en local.

## Clonar

```bash
git clone <repository-url>
cd TFG
```

(Usa el nombre de la carpeta en la que hayas clonado si no es `TFG`.)

## Configuración / secretos

- **Ruta Docker:** copia `docker/.env.example` a `docker/.env`, define un `SECRET_KEY` largo y aleatorio, y mantén `DATABASE_URL` alineado con el usuario/contraseña/base de datos de Postgres que definas. Paso a paso (español): [docker/ComoUsarDocker.txt](../docker/ComoUsarDocker.txt).
- **Backend en local:** crea `backend/.env` con al menos `DATABASE_URL` y `SECRET_KEY` (misma idea que en `docker/.env.example`). Si Postgres corre en tu máquina (no dentro de Compose), usa el host `localhost` y el puerto `5432` en `DATABASE_URL`, no `db`.

El frontend llama a la API en `http://localhost:8000` (véase `frontend/src/shared/api/api.tsx`); no hace falta un archivo `.env` aparte en el frontend para la configuración por defecto.

## Instalación

```bash
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..
```

## Ejecución

**Opción A — Docker (base de datos + backend + frontend):** desde la carpeta `docker`, ejecuta `docker compose up --build`. La primera ejecución puede tardar bastante.

**Opción B — Local:** arranca Postgres, aplica las migraciones desde `backend` (`uv run alembic upgrade head`), luego `uv run uvicorn main:app --reload` (sigue en `backend`). En otra terminal, desde `frontend`, ejecuta `npm run dev`.

## URLs

| Qué         | URL                          |
| ----------- | ---------------------------- |
| Frontend    | http://localhost:5173        |
| Raíz API    | http://localhost:8000        |
| OpenAPI UI  | http://localhost:8000/docs   |
| ReDoc       | http://localhost:8000/redoc  |

Probar la API de forma interactiva es más sencillo con **Swagger** en `/docs`.

## Cuentas y datos

**No hay script de datos iniciales** incluido. Usa el flujo de **registro** de la interfaz para crear un usuario.

Solo para desarrollo, el backend expone `POST /users/create_admin`, que crea un usuario administrador (`admin` / `admin@admin` / contraseña `admin`). Está marcado para eliminación en `backend/modules/users/routes.py`; no lo uses en producción.

---

El texto de plantilla en [frontend/README.md](../frontend/README.md) es el boilerplate genérico de Vite, no instrucciones de ejecución específicas del proyecto.
