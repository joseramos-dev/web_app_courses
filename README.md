# Inicio rápido para revisores

Gracias por echar un vistazo. A continuación muestro **dos formas** en las que poder testear rápidamente el proyecto.
1. Una de ellas es usando los **docker**, para lo cual seria necesario tener instalado previamente **Docker Desktop** y en ejecución.
2. La otra forma es abriendo dos terminales, una terminal en la carpeta **/backend** y otra desde  **/frontend**:
    - Desde **/backend** ejecutaremos _uv run uvicorn main:app --reload_ (sera necesario tener instalado: Python, uv, Node.js, PostgresSQL)
    - Desde **/frontend** ejecutaremos _npm run dev_ (seria necesario tener Node.js instalado previamente)

## Clonar

```bash
git clone https://github.com/joseramos-dev/web_app_courses.git
cd TFG
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

Desde **Swagger** (`http://localhost:8000/docs`) tendremos acceso a métodos que nos permitiran testear mejor el programa:
 - `users/create_admin`: nos permitira crear un admin inicial, ya que desde el login de la aplicación no se podra.
 - `courses/populate_courses`: llenara la base de datos con cursos que usaremos para probar el funcionamiento de la aplicación. Para ejecutar este método, sera necesario estar autentificado como **admin**. (en **Swagger** arriba a la derecha de la página, deberia de haber una pestaña en la que ponga _authorize_, desde hay te deberia de loggear con el usuario y contraseña del admin que hayas creado con _create_admin_)

___

