# Backend — Kursa

Documentación técnica de la API REST de **Kursa**, plataforma de cursos online del TFG. El backend expone una aplicación **FastAPI** sin prefijo global (`/api`); todos los routers se montan en la raíz del servidor (puerto **8000** por defecto).

**Enlaces relacionados:** [Índice de documentación](./README.md) · [API e integración frontend-backend](../api-and-integration.md) · [README del repositorio](../README.md) · Swagger en ejecución: http://localhost:8000/docs

---

## Pila tecnológica

| Capa | Tecnología | Notas |
|------|------------|-------|
| **Runtime** | Python ≥ 3.12 | El repo fija `3.14` en `backend/.python-version` (pista para herramientas locales) |
| **Gestor de paquetes** | [uv](https://github.com/astral-sh/uv) | `pyproject.toml` + `uv.lock` |
| **Framework HTTP** | FastAPI ≥ 0.135 | Routers modulares, validación Pydantic v2 |
| **Servidor ASGI** | Uvicorn | Desarrollo con `--reload`; Docker usa `0.0.0.0:8000` |
| **ORM** | SQLAlchemy 2.x | Modelos declarativos, `SessionLocal`, relaciones |
| **Migraciones** | Alembic | Autogenerate importando todos los modelos en `alembic/env.py` |
| **Base de datos** | PostgreSQL 16 | Drivers `psycopg[binary]` (psycopg 3) y `psycopg2-binary` |
| **Autenticación** | OAuth2 password flow + JWT | `python-jose`, `OAuth2PasswordBearer` |
| **Hash de contraseñas** | bcrypt vía passlib | Truncado a 72 bytes en `hash_password` |
| **Configuración** | python-dotenv | Variables cargadas en `core/database.py`, `core/security.py`, Alembic |
| **Análisis de datos** | pandas, numpy, matplotlib, Jupyter | Solo en `data_analysis/`; no forma parte del runtime de la API |

---

## Estructura de carpetas

```text
backend/
├── main.py                 # Punto de entrada FastAPI, CORS, registro de routers
├── pyproject.toml          # Dependencias y metadatos del proyecto
├── uv.lock                 # Lockfile de uv
├── .python-version         # Versión de Python sugerida (3.14)
├── alembic.ini             # Configuración de Alembic
├── alembic/
│   ├── env.py              # Metadatos de migración (importa todos los modelos)
│   └── versions/           # Revisiones de esquema
├── core/                   # Infraestructura compartida
│   ├── database.py         # Engine, SessionLocal, Base, get_db
│   ├── security.py         # JWT, bcrypt, OAuth2PasswordBearer
│   └── dependencies.py     # require_role, paginación/ordenación de cursos
├── modules/                # Dominios de negocio (patrón por módulo)
│   ├── auth/               # Login, /me
│   ├── users/              # CRUD usuarios, roles
│   ├── courses/            # Catálogo, CRUD, lecciones anidadas, valoraciones
│   ├── lessons/            # Lecciones, preguntas, opciones de respuesta
│   ├── enrollments/        # Matrículas
│   ├── progress/           # Progreso por lección, actividad de estudio
│   ├── dashboard/          # Resúmenes por rol
│   └── course_ratings/     # Modelo/servicio sin router propio
└── data_analysis/          # Notebooks y CSV (importación Kaggle, no runtime)
```

### Patrón por módulo

Cada dominio bajo `modules/` suele seguir esta convención:

| Archivo | Responsabilidad |
|---------|-----------------|
| `model.py` | Tablas SQLAlchemy (`Base`) |
| `schema.py` | DTOs Pydantic (request/response) |
| `service.py` | Lógica de negocio y acceso a datos |
| `routes.py` | Endpoints FastAPI (`APIRouter`) |

Excepción: **`course_ratings`** solo tiene `model.py`, `schema.py` y `service.py`; sus endpoints viven en `courses/routes.py`.

---

## Punto de entrada: `main.py`

`main.py` construye la aplicación, configura CORS y registra siete routers sin prefijo adicional.

```python
app = FastAPI()

# CORS: frontend Vite (5173) y variantes en 3000
app.add_middleware(CORSMiddleware, ...)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(courses_router)
app.include_router(lessons_router)
app.include_router(enrollments_router)
app.include_router(progress_router)
app.include_router(dashboard_router)

@app.get("/")
def read_root():
    return {"status": "ok"}
```

**Notas importantes:**

- No se usa `Base.metadata.create_all()`; el esquema lo gestiona **Alembic**.
- Los orígenes CORS permitidos son `localhost` / `127.0.0.1` en puertos **5173** y **3000**, con credenciales habilitadas.
- Health check mínimo: `GET /` → `{"status": "ok"}`.

### Comandos útiles (comentados en `main.py`)

```bash
# Desarrollo local
uv run uvicorn main:app --reload

# Acceso desde la LAN
uv run uvicorn main:app --host 0.0.0.0 --port 8000

# Migraciones
alembic revision --autogenerate -m "descripción del cambio"
alembic upgrade head
```

---

## Variables de entorno

Coloca un archivo `.env` en `backend/` (o usa `docker/.env` si ejecutas con Docker Compose). La aplicación **falla al arrancar** si faltan las variables obligatorias.

| Variable | Obligatoria | Valor por defecto | Descripción |
|----------|-------------|-------------------|-------------|
| `DATABASE_URL` | **Sí** | — | URL SQLAlchemy para PostgreSQL. Ejemplo local: `postgresql+psycopg://usuario:clave@localhost:5432/kursa` |
| `SECRET_KEY` | **Sí** | — | Clave para firmar y verificar JWT. Usar una cadena larga y aleatoria en producción |
| `ALGORITHM` | No | `HS256` | Algoritmo JWT (`create_access_token` y `jwt.decode`) |
| `EXP_TOKEN` | No | `30` | Vida del access token en **minutos** |

### Ejemplo `.env` (desarrollo local)

```env
DATABASE_URL=postgresql+psycopg://kursa:kursa_dev_change_me@localhost:5432/kursa
SECRET_KEY=una-cadena-muy-larga-y-aleatoria
ALGORITHM=HS256
EXP_TOKEN=30
```

### Docker

En `docker/docker-compose.yml`, el servicio `backend` recibe las mismas variables desde `docker/.env` (plantilla: `docker/.env.example`). Dentro de Compose el host de Postgres es **`db`**, no `localhost`:

```env
DATABASE_URL=postgresql+psycopg://kursa:kursa_dev_change_me@db:5432/kursa
```

El contenedor ejecuta `alembic upgrade head` antes de arrancar Uvicorn (`docker/Dockerfile.backend`).

---

## Modelo de datos y relaciones

### Diagrama entidad-relación

```mermaid
erDiagram
    users ||--o{ courses : "instructor_id"
    users ||--o{ enrollments : "user_id"
    users ||--o{ course_ratings : "user_id"
    users ||--o{ study_activity : "user_id"

    courses ||--o{ lessons : "course_id"
    courses ||--o{ enrollments : "course_id"
    courses ||--o{ course_ratings : "course_id"

    lessons ||--o{ questions : "lesson_id"
    lessons ||--o{ lesson_progress : "lesson_id"

    questions ||--o{ answer_options : "question_id"

    enrollments ||--o{ lesson_progress : "enrollment_id"

    users {
        int id PK
        string name UK
        string email UK
        text hash_password
        enum role
        datetime time_creation
    }

    courses {
        int id PK
        string title
        string url
        enum site
        enum category
        enum language
        enum course_type
        string subcategory
        text intro
        int duration_seconds
        int instructor_id FK
        datetime created_at
        datetime updated_at
    }

    lessons {
        int id PK
        int course_id FK
        string title
        enum lesson_type
        int position
        text body
        string video_url
    }

    questions {
        int id PK
        int lesson_id FK
        text prompt
        int position
    }

    answer_options {
        int id PK
        int question_id FK
        text text
        bool is_correct
        int position
    }

    enrollments {
        int id PK
        int user_id FK
        int course_id FK
        enum status
        float progress_percent
        int completed_lessons_count
        datetime enrolled_at
        datetime completed_at
    }

    lesson_progress {
        int id PK
        int enrollment_id FK
        int lesson_id FK
        enum status
        int watched_seconds
        float best_score
        int attempts
    }

    course_ratings {
        int id PK
        int user_id FK
        int course_id FK
        int score
    }

    study_activity {
        int id PK
        int user_id FK
        date activity_date
        int seconds_studied
        int lessons_completed
        int lessons_started
    }
```

### Relaciones clave

| Relación | Cardinalidad | Restricciones |
|----------|--------------|---------------|
| Usuario → Curso (instructor) | 1:N | `courses.instructor_id` nullable; un instructor puede tener varios cursos |
| Usuario ↔ Curso (matrícula) | N:M vía `enrollments` | Única por `(user_id, course_id)` |
| Curso → Lección | 1:N | `ON DELETE CASCADE`; posición única por curso |
| Lección → Pregunta → Opción | 1:N:N | Cascada en borrado; posiciones únicas por padre |
| Matrícula → Progreso de lección | 1:N | Única por `(enrollment_id, lesson_id)` |
| Usuario ↔ Curso (valoración) | N:M vía `course_ratings` | Una valoración por usuario y curso; score 1–5 |
| Usuario → Actividad diaria | 1:N | Una fila por `(user_id, activity_date)` |

### Columnas virtuales en `CourseModel`

El modelo de curso expone agregados calculados con `column_property` (no son columnas físicas):

- `lessons_count` — número de lecciones
- `instructor_name` — nombre del instructor
- `rating` — media de `course_ratings.score`
- `ratings_count` — número de valoraciones

### Enumeraciones relevantes

**Roles de usuario:** `student`, `instructor`, `admin`

**Estado de matrícula:** `in_progress`, `completed`, `dropped`

**Estado de progreso de lección:** `not_started`, `in_progress`, `completed`

**Tipos de lección:** `text`, `video`, `test`, `multiple_selection`

**Sitios de curso (`Site`):** Coursera, Future Learn, Udacity, Simplilearn, Academy

---

## Autenticación, JWT y roles

### Flujo de login

1. El cliente envía `POST /token` con cuerpo **form-urlencoded** (`username`, `password`), compatible con `OAuth2PasswordRequestForm`.
2. `username` acepta **nombre de usuario o email** (`get_user_by_name_or_email`).
3. Se verifica la contraseña con bcrypt (`verify_password`).
4. Se emite un JWT con `create_access_token(user_id, role)`.

### Contenido del JWT

| Claim | Valor |
|-------|-------|
| `sub` | ID del usuario (string) |
| `role` | Rol actual (`student` / `instructor` / `admin`) |
| `exp` | Expiración UTC (`EXP_TOKEN` minutos) |

Algoritmo por defecto: **HS256**, firmado con `SECRET_KEY`.

### Uso del token en rutas protegidas

- **Extracción:** `OAuth2PasswordBearer(tokenUrl="token")` en `core/security.py`.
- **Usuario actual:** `Depends(get_current_user)` decodifica el JWT y carga el usuario desde la BD.
- **Control por rol:** `Depends(require_role(["admin"]))` — factory en `core/dependencies.py` que devuelve 403 si el rol no está en la lista.

```mermaid
sequenceDiagram
    participant Cliente
    participant API as FastAPI
    participant Auth as auth/service
    participant DB as PostgreSQL

    Cliente->>API: POST /token (form: username, password)
    API->>DB: Buscar usuario por name/email
    API->>API: verify_password + create_access_token
    API-->>Cliente: { access_token, token_type: bearer }

    Cliente->>API: GET /me (Authorization: Bearer …)
    API->>Auth: jwt.decode + get_user
    Auth->>DB: SELECT users WHERE id = sub
    API-->>Cliente: UserSchema
```

### Roles y permisos (resumen)

| Rol | Capacidades principales |
|-----|-------------------------|
| **student** | Matricularse, avanzar lecciones, valorar cursos (matriculado), dashboard estudiante |
| **instructor** | Crear/editar cursos propios, gestionar lecciones y preguntas, dashboard instructor |
| **admin** | Todo lo anterior + reasignar instructores, cambiar roles, dashboard admin, endpoints de desarrollo |

**Reglas de propiedad de curso:** un instructor solo edita cursos donde `course.instructor_id == user.id`. Los admins pueden editar cualquier curso y reasignar `instructor_id`.

**Nota:** varios endpoints de lectura (listado de cursos, detalle de curso, lecciones públicas) **no requieren autenticación**.

---

## Endpoints por dominio

Todos los paths son relativos a `http://localhost:8000`. La columna **Auth** indica el requisito mínimo.

### Raíz y sistema

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/` | Público | Health check: `{"status": "ok"}` |

### Auth (`modules/auth`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/token` | Público | Login OAuth2; devuelve JWT |
| `GET` | `/me` | Bearer | Perfil del usuario autenticado |
| `PATCH` | `/me` | Bearer | Autoactualización de nombre, email o contraseña |

### Users — prefijo `/users`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/users/` | Público* | Lista usuarios; query opcional `?role=instructor` |
| `POST` | `/users/` | Público* | Registro (`UserCreateSchema`) |
| `DELETE` | `/users/{user_id}` | Público* | Eliminar usuario |
| `PATCH` | `/users/{user_id}/role/{role}` | **admin** | Cambiar rol |
| `POST` | `/users/create_admin` | Público* | **Solo desarrollo:** crea admin `admin@admin` / `admin` |

\*En producción convendría proteger estas rutas; actualmente varias están abiertas.

### Courses — prefijo `/courses`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/courses/` | Público | Listado paginado con filtros y ordenación |
| `POST` | `/courses/create` | Bearer (instructor/admin) | Crear curso |
| `GET` | `/courses/{course_id}` | Público | Detalle de curso |
| `PUT` | `/courses/{course_id}` | Bearer (admin o instructor dueño) | Actualizar curso |
| `GET` | `/courses/{course_id}/lessons` | Público | Lecciones del curso (ordenadas) |
| `POST` | `/courses/{course_id}/lessons/reorder` | Bearer (admin o dueño) | Reordenar lecciones |
| `PUT` | `/courses/{course_id}/rating` | Bearer (**student**) | Crear/actualizar valoración (1–5) |
| `GET` | `/courses/{course_id}/rating/me` | Bearer (**student**) | Valoración propia |
| `POST` | `/courses/populate_courses` | **admin** | **Solo desarrollo:** importar CSV Kaggle |

**Query params de `GET /courses/`:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `limit` | int (default 100) | Tamaño de página |
| `offset` | int (default 0) | Desplazamiento |
| `sort_by` | `title` \| `duration_seconds` \| `rating` \| `created_at` | Campo de ordenación |
| `order` | `asc` \| `desc` | Dirección |
| `search` | string | Búsqueda en título (`ILIKE`) |
| `site`, `category`, `language`, `course_type` | listas | Filtros múltiples (repetir clave en query) |

### Lessons — prefijo `/lessons`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/lessons/` | Público | Todas las lecciones |
| `GET` | `/lessons/course/{course_id}` | Público | Lecciones de un curso |
| `GET` | `/lessons/{lesson_id}` | Público | Detalle de lección |
| `POST` | `/lessons/{course_id}` | Bearer (editor) | Crear lección |
| `PATCH` | `/lessons/{lesson_id}` | Bearer (editor) | Actualizar lección |
| `DELETE` | `/lessons/{lesson_id}` | Bearer (editor) | Borrar lección |
| `POST` | `/lessons/course/{course_id}/reorder` | Bearer (editor) | Reordenar (alternativa a ruta en courses) |
| `GET` | `/lessons/{lesson_id}/questions` | Bearer (matriculado o editor) | Preguntas **sin** `is_correct` |
| `GET` | `/lessons/{lesson_id}/questions/admin` | Bearer (editor) | Preguntas **con** `is_correct` |
| `POST` | `/lessons/{lesson_id}/questions` | Bearer (editor) | Crear pregunta |
| `PUT` | `/lessons/{lesson_id}/questions/{question_id}` | Bearer (editor) | Actualizar pregunta |
| `DELETE` | `/lessons/{lesson_id}/questions/{question_id}` | Bearer (editor) | Eliminar pregunta |

*Editor = admin o instructor dueño del curso.*

### Enrollments — prefijo `/enrollments`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/enrollments/{course_id}` | Bearer (**student**) | Matricularse (idempotente) |
| `GET` | `/enrollments/me` | Bearer | Listar mis matrículas |
| `GET` | `/enrollments/me/course/{course_id}` | Bearer | Matrícula + progreso por lección; **404** si no matriculado |
| `POST` | `/enrollments/me/course/{course_id}/complete-without-lessons` | Bearer (**student**) | Completar curso sin lecciones |

### Progress — prefijo `/progress`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/progress/lesson/{lesson_id}` | Bearer | Estado de progreso de la lección |
| `POST` | `/progress/lesson/{lesson_id}/start` | Bearer | Marcar lección como iniciada |
| `POST` | `/progress/lesson/{lesson_id}/complete` | Bearer | Completar lección; body opcional con respuestas para test/quiz |

**Completar lección:** para `test` y `multiple_selection` el body debe incluir las opciones seleccionadas. Umbral de aprobación: **70 %** (`PASSING_SCORE` en `progress/service.py`). TEXT y VIDEO ignoran el body.

### Dashboard — prefijo `/dashboard`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/dashboard/student/me` | **student** o **admin** | Resumen estudiante (rachas, cursos recientes, actividad 7 días) |
| `GET` | `/dashboard/instructor/me` | **instructor** o **admin** | Resumen instructor (cursos, alumnos, tops) |
| `GET` | `/dashboard/admin` | **admin** | Métricas globales de la plataforma |

---

## Arquitectura de capas

```mermaid
flowchart TB
    subgraph Cliente
        FE[Frontend React / Swagger]
    end

    subgraph main_py["main.py"]
        APP[FastAPI + CORS]
    end

    subgraph Routers["modules/*/routes.py"]
        R_AUTH[auth]
        R_USERS[users]
        R_COURSES[courses]
        R_LESSONS[lessons]
        R_ENR[enrollments]
        R_PROG[progress]
        R_DASH[dashboard]
    end

    subgraph Core["core/"]
        DB_DEP[get_db]
        SEC[JWT / bcrypt]
        ROLE[require_role]
        PAG[paginación cursos]
    end

    subgraph Services["modules/*/service.py"]
        SVC[Lógica de negocio]
    end

    subgraph Data["Persistencia"]
        ORM[(SQLAlchemy Models)]
        PG[(PostgreSQL)]
        ALEMBIC[Alembic migrations]
    end

    FE -->|HTTP JSON / form| APP
    APP --> R_AUTH & R_USERS & R_COURSES & R_LESSONS & R_ENR & R_PROG & R_DASH
    R_AUTH & R_USERS & R_COURSES & R_LESSONS & R_ENR & R_PROG & R_DASH --> DB_DEP
    R_AUTH & R_USERS & R_COURSES & R_LESSONS & R_ENR & R_PROG & R_DASH --> SEC
    R_COURSES & R_DASH --> ROLE
    R_COURSES --> PAG
    R_AUTH & R_USERS & R_COURSES & R_LESSONS & R_ENR & R_PROG & R_DASH --> SVC
    SVC --> ORM
    ORM --> PG
    ALEMBIC --> PG
```

### Flujo típico de una petición autenticada

1. **Router** recibe la petición y resuelve dependencias (`get_db`, `get_current_user`, `require_role`).
2. **Service** aplica reglas de negocio, lanza `HTTPException` con códigos semánticos (401, 403, 404, 409).
3. **Model** persiste o consulta mediante la sesión SQLAlchemy.
4. **Schema** Pydantic serializa la respuesta (`response_model`).

---

## Configuración de desarrollo

### Requisitos

- Python ≥ 3.12
- [uv](https://github.com/astral-sh/uv)
- PostgreSQL 16 (local o vía Docker)
- Opcional: Docker Desktop para el stack completo

### Opción A — Docker (recomendado para revisores)

```bash
cd docker
cp .env.example .env   # Editar SECRET_KEY y credenciales
docker compose up --build
```

Servicios: Postgres **5432**, API **8000**, frontend **5173**. Las migraciones se aplican al arrancar el backend.

### Opción B — Local

1. Crear base de datos y usuario en PostgreSQL (coincidentes con `DATABASE_URL`).
2. Crear `backend/.env` con `DATABASE_URL` y `SECRET_KEY`.
3. Instalar dependencias y migrar:

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn main:app --reload
```

4. En otra terminal, arrancar el frontend desde `frontend/` con `npm run dev`.

### Datos iniciales (manual)

No hay seed automático. Para pruebas:

1. `POST /users/create_admin` — crea administrador (`admin` / `admin@admin` / `admin`).
2. Login en Swagger → **Authorize** con el token.
3. `POST /courses/populate_courses` — importa cursos desde `data_analysis/online_courses_clean.csv` (requiere admin).

También puedes registrar usuarios con `POST /users/` desde la UI o Swagger.

### URLs de desarrollo

| Recurso | URL |
|---------|-----|
| API | http://localhost:8000 |
| OpenAPI (Swagger) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Frontend | http://localhost:5173 |

---

## Convenciones del proyecto

### Organización del código

- **Un router por dominio**, montado explícitamente en `main.py` (sin descubrimiento automático).
- **Lógica en `service.py`**, no en los routers; los routes validan permisos y delegan.
- **Schemas Pydantic** separados de modelos SQLAlchemy; `ConfigDict(from_attributes=True)` para respuestas ORM.
- **Errores HTTP** mediante `HTTPException` con `detail` en string (FastAPI → JSON `{ "detail": "..." }`).

### Base de datos

- Migraciones con **Alembic**; no usar `create_all` en producción.
- `alembic/env.py` importa todos los modelos para que `--autogenerate` detecte cambios.
- Borrados en cascada en lecciones, preguntas, opciones y progreso ligado a matrículas.
- Restricciones `UniqueConstraint` en posiciones (lección por curso, pregunta por lección, etc.).

### Seguridad

- Contraseñas nunca en claro; hash bcrypt con límite de 72 caracteres.
- JWT stateless; no hay refresh token en el diseño actual.
- Preguntas de quiz: endpoint **público para estudiantes** oculta `is_correct`; solo `/questions/admin` la expone.

### API HTTP

- Sin prefijo `/api`; el frontend usa `baseURL: http://localhost:8000/`.
- Login: `application/x-www-form-urlencoded` en `/token`.
- Resto: JSON (`application/json`).
- Filtros de lista múltiple: repetir clave en query string (p. ej. `category=business&category=health`).

### Nomenclatura

- Tablas en plural snake_case (`users`, `lesson_progress`).
- Enums de dominio en `model.py` del módulo correspondiente.
- Routers exportados como `*_router` (p. ej. `courses_router`).

---

## Notas para desarrolladores

### Endpoints marcados para eliminar en producción

Comentarios `TODO` en el código:

- `POST /users/create_admin` — bootstrap de admin sin autenticación.
- `POST /courses/populate_courses` — carga masiva desde CSV.

Convendría proteger o eliminar estos endpoints antes de un despliegue real.

### Progreso y matrículas

- Al matricularse, se crea `EnrollmentModel` con `status=in_progress`.
- `lesson_progress` se crea bajo demanda al iniciar o completar una lección.
- `enrollments.progress_percent` y `completed_lessons_count` se **recalculan** al completar lecciones (desnormalización para dashboards rápidos).
- `study_activity` agrega por día (`user_id`, `activity_date`) al iniciar/completar lecciones — alimenta rachas y gráficos del dashboard estudiante.
- Matrículas `dropped` pueden reactivarse al volver a matricularse (comportamiento idempotente en `enroll_user_in_course`).

### Valoraciones de curso

- Solo estudiantes matriculados (no `dropped`) pueden valorar.
- Si el curso tiene lecciones, exige al menos **una lección completada** antes de valorar.
- La media aparece en `CourseSchema.rating` vía `column_property`.

### Tipos de lección

| Tipo | Contenido | Completar |
|------|-----------|-----------|
| `text` | `body` (Markdown) | POST complete sin body |
| `video` | `video_url` | POST complete; opcional `watched_seconds` |
| `test` / `multiple_selection` | preguntas + opciones | POST complete con respuestas; score ≥ 70 % para aprobar |

### Paginación de cursos

`core/dependencies.py` centraliza `get_pagination` y el mapa de columnas ordenables. El rating ordenable usa la media calculada en SQL (subquery).

### Integración con el frontend

Ver [api-and-integration.md](../api-and-integration.md): el cliente guarda el JWT en `localStorage`, lo inyecta en `Authorization: Bearer`, y trata **404** en `GET /enrollments/me/course/{id}` como “no matriculado”.

### Análisis de datos (`data_analysis/`)

Notebooks y CSV de Kaggle usados para poblar el catálogo inicial. No se importan al arrancar la API; solo mediante `populate_courses`.

### Próximas mejoras sugeridas (no implementadas)

- Proteger `GET/POST/DELETE /users` con roles.
- Refresh tokens o rotación de sesión.
- Variables de entorno para CORS y `baseURL` del frontend.
- Eliminar endpoints de desarrollo o guardarlos tras feature flag.

---

*Documentación generada a partir de `backend/` (FastAPI, SQLAlchemy, Alembic). Para cambios de esquema, crear siempre una revisión Alembic y documentar la migración en el mensaje de commit.*
