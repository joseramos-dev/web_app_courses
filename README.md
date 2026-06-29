# Inicio rápido para revisores

Gracias por echar un vistazo. A continuación muestro **dos formas** en las que poder testear rápidamente el proyecto.
1. Una de ellas es usando los **docker**, para lo cual seria necesario tener instalado previamente **Docker Desktop** y en ejecución.
2. La otra forma es abriendo dos terminales, una terminal en la carpeta **/backend** y otra desde  **/frontend**:
    - Desde **/backend** ejecutaremos _uv run uvicorn main:app --reload_ (sera necesario tener instalado: Python, uv, Node.js, PostgresSQL)
    - Desde **/frontend** ejecutaremos _npm run dev_ (seria necesario tener Node.js instalado previamente)

## Clonar

```bash
git clone https://github.com/joseramos-dev/web_app_courses.git
cd web_app_courses
```

(Usa el nombre de la carpeta en la que hayas clonado si no es `TFG`.)

## Configuración / secretos

- **Ruta Docker:** 
    - copia `docker/.env.example` a `docker/.env`
    - define un `SECRET_KEY` largo y aleatorio, y mantén `DATABASE_URL` alineado con el usuario/contraseña/base de datos de Postgres que definas. 
    - Ejemplo de .env:
        - SECRET_KEY=**STRING MUY LARGO**
        - ALGORITHM=HS256
        - DATABASE_URL=postgresql+psycopg://**USER**:**PASSWORD**@localhost:5432/web_app_courses
        - EXP_TOKEN=30
    - El **USER** y el **PASSWORD** deben de ser los creados en postgres
- **Backend en local:** 
    - crea `backend/.env` con al menos `DATABASE_URL` y `SECRET_KEY` (misma idea que en `docker/.env.example`). 
    - Si Postgres corre en tu máquina (no dentro de Compose), usa el host `localhost` y el puerto `5432` en `DATABASE_URL`, no `db`.

El frontend llama a la API en `http://localhost:8000` (véase `frontend/src/shared/api/api.tsx`); no hace falta un archivo `.env` aparte en el frontend para la configuración por defecto.

## Ejecución

**Opción A — Docker (base de datos + backend + frontend):** desde la carpeta `docker`, ejecuta `docker compose up --build`. La primera ejecución puede tardar bastante. (Sera necesario que Docker Desktop este ejecutandose)

**Opción B — Local:** arranca Postgres, aplica las migraciones desde `backend` (`uv run alembic upgrade head`), luego `uv run uvicorn main:app --reload` (sigue en `backend`). En otra terminal, desde `frontend`, ejecuta `npm run dev`. (Para que funcione en local, sera necesario que en tu equipo, usando psql o la interfaz gráfica de PostgresSQL, hayas creado el usuario, contraseña y tabla correspondiente, y que estas coincidan con la información introducida en los .env)

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

Desde **Swagger** (`http://localhost:8000/docs`) o **scripts CLI** (recomendado en producción):

**Desarrollo** (`ENABLE_DEV_ROUTES=true`):
 - Swagger: `POST /users/create_admin` — admin inicial (`admin` / `admin@admin`).
 - Swagger: `POST /courses/populate_courses` — importa cursos Kaggle (requiere login admin).

**Cualquier entorno** (desde `backend/`):
 - `uv run python -m scripts.bootstrap_admin`
 - `uv run python -m scripts.populate_courses`

**Frontend:** copiar `frontend/.env.example` a `.env.local` y ajustar `VITE_API_URL` si el API no está en `localhost:8000`.

___

