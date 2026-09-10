# Inicio rápido para revisores

Gracias por echar un vistazo. A continuación muestro **dos formas** de testear rápidamente el proyecto.
1. Usando **Docker**: la forma más rápida y con menos requisitos, solo hace falta tener instalado **Docker Desktop** y en ejecución.
2. Abriendo dos terminales, una en la carpeta **/backend** y otra en **/frontend**:
    - Desde **/backend** ejecutaremos `uv run uvicorn main:app --reload` (hace falta tener instalado Python, uv, Node.js y PostgreSQL)
    - Desde **/frontend** ejecutaremos `npm run dev` (hace falta tener Node.js instalado previamente)

## Clonar

```bash
git clone https://github.com/joseramos-dev/web_app_courses.git
cd web_app_courses
```

## Configuración / secretos

- **Ruta Docker:**
    - copia `docker/.env.example` a `docker/.env`
    - define un `SECRET_KEY` largo y aleatorio, y mantén `DATABASE_URL` alineado con el usuario/contraseña/base de datos de Postgres que definas.
    - Ejemplo de `.env`:
        - SECRET_KEY=**STRING MUY LARGO**
        - ALGORITHM=HS256
        - DATABASE_URL=postgresql+psycopg://**USER**:**PASSWORD**@localhost:5432/web_app_courses
        - EXP_TOKEN=30
    - El **USER** y el **PASSWORD** deben de ser los creados en postgres
- **Backend en local:**
    - copia `backend/.env.example` a `backend/.env` (mismas claves que en Docker, pero con `DATABASE_URL` apuntando a `localhost` en vez de `db`)
    - incluye siempre `ALGORITHM=HS256`, aunque sea opcional: si se omite, el login funciona pero todas las rutas que requieren sesión devuelven 401.
    - Si Postgres corre en tu máquina (no dentro de Compose), usa el host `localhost` y el puerto `5432` en `DATABASE_URL`, no `db`.

El frontend llama a la API en `http://localhost:8000` (véase `frontend/src/shared/api/api.tsx`); no hace falta un archivo `.env` aparte en el frontend para la configuración por defecto.

Versiones usadas por el proyecto (orientativas): Python 3.12+, Node.js 22, PostgreSQL 16.

## Ejecución

**Opción A (Docker, base de datos + backend + frontend):** desde la carpeta `docker`, ejecuta `docker compose up --build`. Las migraciones se aplican solas al arrancar el backend, no hace falta ningún paso manual. La primera ejecución puede tardar bastante. (Será necesario que Docker Desktop esté en ejecución.)

**Opción B (Local):** arranca Postgres, aplica las migraciones desde `backend` (`uv run alembic upgrade head`), luego `uv run uvicorn main:app --reload` (sigue en `backend`). En otra terminal, desde `frontend`, ejecuta `npm run dev`. (Para que funcione en local, será necesario que en tu equipo, usando psql o la interfaz gráfica de PostgreSQL, hayas creado el usuario, contraseña y base de datos correspondientes, y que coincidan con la información introducida en los `.env`.)

## URLs

| Qué         | URL                          |
| ----------- | ---------------------------- |
| Frontend    | http://localhost:5173        |
| Raíz API    | http://localhost:8000        |
| OpenAPI UI  | http://localhost:8000/docs   |
| ReDoc       | http://localhost:8000/redoc  |

Probar la API de forma interactiva es más sencillo con **Swagger** en `/docs`.

## Cuentas y datos

Una base de datos recién creada está vacía. De menos a más elaborado:

1. **Registro manual:** usa el flujo de **registro** de la interfaz para crear una cuenta de estudiante o instructor.
2. **Administrador inicial** (con `ENABLE_DEV_ROUTES=true`, activo por defecto fuera de producción): crea el admin `admin` / `admin@admin` (contraseña `admin`) desde Swagger (`POST /users/bootstrap_admin`) o desde `backend/`: `uv run python -m scripts.bootstrap_admin`.
3. **Datos de ejemplo desde la interfaz (recomendado):** inicia sesión como admin y entra al panel de administración. Ahí, la sección de datos de desarrollo permite, con botones: importar cursos con temas y lecciones generados automáticamente, crear usuarios de prueba, simular su actividad (matrículas, lecciones completadas, valoraciones) para que el dashboard tenga estadísticas realistas, eliminar los usuarios de prueba, o resetear la base de datos (con o sin conservar usuarios). Solo aparece si el backend tiene `ENABLE_DEV_ROUTES=true` y has iniciado sesión como admin.
4. **Mismos pasos por terminal**, desde `backend/`: `uv run python -m scripts.populate_courses`, `scripts.seed_demo_data` y `scripts.simulate_students`.

**Frontend:** copiar `frontend/.env.example` a `.env.local` y ajustar `VITE_API_URL` si el API no está en `localhost:8000`.

**Recuperación de contraseña en local:** sin `SMTP_*` configurado (el caso por defecto), el correo no se envía pero tampoco falla nada visible; el enlace de recuperación se registra como aviso (`WARNING`) en la terminal donde corre el backend. Cópialo de ahí para completar el flujo. Para que el correo se envíe de verdad, rellena las variables `SMTP_*` ya comentadas en `docker/.env.example` (por ejemplo con una sandbox de Mailtrap).

## Admin y Herramientas de Desarrollo

### Crear un usuario administrador

**Opción A (línea de comandos):** desde la carpeta `backend`, ejecuta:
```bash
uv run python -m scripts.bootstrap_admin
```

**Opción B (Swagger en el navegador):** con el backend en ejecución, ve a `http://localhost:8000/docs` y busca el endpoint `POST /users/bootstrap_admin`. Haz clic en "Try it out" y luego "Execute". 

Credenciales por defecto: `admin` / `admin@admin` (contraseña: `admin`). 

Inicia sesión con estas credenciales en el frontend para acceder al panel de administración.

### Herramientas de desarrollo

Con `ENABLE_DEV_ROUTES=true` (habilitado por defecto fuera de producción) y con sesión de administrador, el panel de administración muestra botones para:

- **Seed Courses:** importa un catálogo de cursos con temas y lecciones generadas automáticamente.
- **Seed Users:** crea usuarios de prueba (estudiantes e instructores).
- **Simulate Students:** genera actividad realista (matrículas, lecciones completadas, valoraciones).
- **Remove Users:** elimina los usuarios de prueba.
- **Reset Database:** vacía todas las tablas (con opción de conservar usuarios).

Estas herramientas son útiles para rellenar rápidamente la base de datos con datos de prueba y testear la funcionalidad de la aplicación.

___
