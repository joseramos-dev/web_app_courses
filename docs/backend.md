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
| `REFRESH_TOKEN_DAYS` | No | `7` | Vida del refresh token en días |
| `ENVIRONMENT` | No | `development` | `production` desactiva rutas de desarrollo por defecto |
| `ENABLE_DEV_ROUTES` | No | `true` (dev) / `false` (prod) | Expone `POST /users/create_admin` y `POST /courses/populate_courses` |
| `CORS_ORIGINS` | No | localhost:5173/3000 | Orígenes permitidos, separados por coma |

### Ejemplo `.env` (desarrollo local)

```env
DATABASE_URL=postgresql+psycopg://kursa:kursa_dev_change_me@localhost:5432/kursa
SECRET_KEY=una-cadena-muy-larga-y-aleatoria
ALGORITHM=HS256
EXP_TOKEN=30
REFRESH_TOKEN_DAYS=7
ENVIRONMENT=development
ENABLE_DEV_ROUTES=true
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
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
    users ||--o{ refresh_tokens : "user_id"

    refresh_tokens {
        int id PK
        int user_id FK
        string token_hash
        datetime expires_at
        datetime revoked_at
    }

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
        enum difficulty
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
        float max_score
        float passing_score
        bool allows_file_submission
    }

    lesson_submissions {
        int id PK
        int enrollment_id FK
        int lesson_id FK
        text body
        int file_id FK
        enum status
        float score
        text feedback
        datetime submitted_at
        datetime graded_at
        int graded_by FK
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

    lesson_attempts {
        int id PK
        int enrollment_id FK
        int lesson_id FK
        float score
        bool passed
        datetime attempted_at
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
| Matrícula → Intentos de lección | 1:N | Historial por intento en tests; índice `(enrollment_id, lesson_id, attempted_at DESC)` |
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

**Tipos de lección:** `text`, `video`, `test`, `multiple_selection`, `assignment`

**Sitios de curso (`Site`):** Coursera, Future Learn, Udacity, Simplilearn, Academy

---

## Autenticación, JWT y roles

### Flujo de login

1. El cliente envía `POST /token` con cuerpo **form-urlencoded** (`username`, `password`), compatible con `OAuth2PasswordRequestForm`.
2. `username` acepta **nombre de usuario o email** (`get_user_by_name_or_email`).
3. Se verifica la contraseña con bcrypt (`verify_password`).
4. Se emite un par access + refresh token (`create_token_pair`).

### Refresh tokens

- Tabla `refresh_tokens`: hash SHA-256 del token opaco, expiración (`REFRESH_TOKEN_DAYS`), revocación en rotación/logout.
- `POST /token/refresh` — rota el refresh (revoca el anterior, emite par nuevo); **401** si inválido.
- `POST /token/logout` — revoca el refresh token (idempotente).

### Contenido del JWT (access)

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
    API->>API: verify_password + create_token_pair
    API-->>Cliente: { access_token, refresh_token, token_type: bearer }

    Cliente->>API: GET /me (Authorization: Bearer …)
    API->>Auth: jwt.decode + get_user
    Auth->>DB: SELECT users WHERE id = sub
    API-->>Cliente: UserSchema

    Note over Cliente,API: Access expirado → POST /token/refresh → nuevo par
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
| `POST` | `/token` | Público | Login OAuth2; devuelve access + refresh token |
| `POST` | `/token/refresh` | Público | Renueva par de tokens (rotación) |
| `POST` | `/token/logout` | Público | Revoca refresh token |
| `GET` | `/me` | Bearer | Perfil del usuario autenticado |
| `PATCH` | `/me` | Bearer | Autoactualización de nombre, email o contraseña |

### Users — prefijo `/users`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/users/` | **admin** | Lista usuarios; query opcional `?role=instructor` |
| `POST` | `/users/` | Público | Registro (`UserCreateSchema`); rechaza `role=admin` |
| `DELETE` | `/users/{user_id}` | **admin** | Eliminar usuario |
| `PATCH` | `/users/{user_id}/role/{role}` | **admin** | Cambiar rol |
| `POST` | `/users/create_admin` | Bootstrap / **admin** | **Solo si `ENABLE_DEV_ROUTES=true`:** crea admin `admin@admin` / `admin` |

### Courses — prefijo `/courses`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/courses/` | Público | Listado paginado con filtros y ordenación |
| `POST` | `/courses/create` | Bearer (instructor/admin) | Crear curso |
| `GET` | `/courses/{course_id}` | Público | Detalle de curso |
| `PUT` | `/courses/{course_id}` | Bearer (admin o instructor dueño) | Actualizar curso |
| `DELETE` | `/courses/{course_id}` | Bearer (admin o instructor dueño) | Eliminar curso (cascada en BD: lecciones, matrículas, valoraciones, progreso) |
| `GET` | `/courses/{course_id}/lessons` | Público | Lecciones del curso (ordenadas) |
| `POST` | `/courses/{course_id}/lessons/reorder` | Bearer (admin o dueño) | Reordenar lecciones |
| `PUT` | `/courses/{course_id}/rating` | Bearer (**student**) | Crear/actualizar valoración (1–5) |
| `GET` | `/courses/{course_id}/rating/me` | Bearer (**student**) | Valoración propia |
| `GET` | `/courses/{course_id}/instructor/enrollments` | Bearer (admin o instructor dueño) | Lista de alumnos + agregados analíticos (tasa finalización, valoración, stats por lección, buckets de progreso, cohortes) |
| `GET` | `/courses/{course_id}/instructor/enrollments/{user_id}` | Bearer (admin o instructor dueño) | Progreso lección a lección de un alumno |
| `GET` | `/courses/{course_id}/submissions` | Bearer (admin o instructor dueño) | Entregas de tareas; query opcional `?status=pending\|graded\|returned` |
| `PATCH` | `/courses/{course_id}/submissions/{submission_id}/grade` | Bearer (admin o instructor dueño) | Calificar o devolver una entrega (`score`, `feedback`, `returned`) |
| `POST` | `/courses/populate_courses` | **admin** | **Solo si `ENABLE_DEV_ROUTES=true`:** importar CSV Kaggle |

**Query params de `GET /courses/`:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `limit` | int (default 100) | Tamaño de página |
| `offset` | int (default 0) | Desplazamiento |
| `sort_by` | `title` \| `duration_seconds` \| `rating` \| `created_at` | Campo de ordenación |
| `order` | `asc` \| `desc` | Dirección |
| `search` | string | Búsqueda en título (`ILIKE`) |
| `site`, `category`, `language`, `course_type` | listas | Filtros múltiples (repetir clave en query) |
| `duration_bucket` | lista (`short`, `medium`, `long`) | Filtra por bucket derivado de `duration_seconds` (< 10 h / 10 h–1 sem / > 1 sem). Cursos sin duración se excluyen. |
| `difficulty` | lista (`beginner`, `intermediate`, `advanced`) | Filtro múltiple por dificultad |

**Campos de curso relevantes:**

| Campo | Tipo | Notas |
|-------|------|-------|
| `difficulty` | `beginner` \| `intermediate` \| `advanced` | Persistido; default `intermediate` |
| `duration_bucket` | calculado en respuesta | Derivado de `duration_seconds`; no es columna en BD |

### Recommendations — prefijo `/recommendations`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/recommendations/me` | Bearer (**student** o **admin**) | Cursos recomendados (content-based + colaborativo) |
| `GET` | `/recommendations/preferences` | Bearer (**student** o **admin**) | Preferencias del perfil de recomendación |
| `PATCH` | `/recommendations/preferences` | Bearer (**student** o **admin**) | Actualizar preferencias |

**Preferencias en `user_recommendations` (JSON arrays):** `preferred_sites`, `preferred_categories`, `preferred_languages`, `preferred_course_types`, `preferred_duration_buckets` (`short`/`medium`/`long`), `preferred_difficulties` (`beginner`/`intermediate`/`advanced`).

El recomendador content-based (`aux_content_based.py`, `aux_history_based.py`) combina hasta tres señales:

1. **Preferencias explícitas** — coincidencias / dimensiones seleccionadas en Ajustes (hasta 6 dimensiones).
2. **Historial de completados** — perfil inferido por frecuencia de `site`, `category`, `language`, `course_type`, `duration_bucket` y `difficulty` en cursos con matrícula `COMPLETED`. Activa recomendaciones aunque el usuario no haya configurado preferencias.
3. **Valoraciones de cursos similares** — media ponderada de las valoraciones del usuario en completados que comparten ≥2 dimensiones con el candidato; si no hay similares valorados, usa la valoración global del curso.

Score final: `0.65 × content_score + 0.35 × rating_signal`, donde `content_score = max(preferencias, historial)`.

**Orquestación** (`recommend_courses`): con ≥3 matrículas activas/completadas intenta colaborativo (similitud coseno); si no hay resultados, usa content-based híbrido.

**`source_type` en respuesta:** `preferences` | `history` | `collaborative`.

Cursos con `duration_seconds` null/0 no coinciden con preferencias de duración.

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
| `POST` | `/lessons/{lesson_id}/files` | Bearer (editor) | Subir material (multipart; PDF por defecto, máx. 10 MB) |
| `GET` | `/lessons/{lesson_id}/files` | Bearer (matriculado o editor) | Metadatos de archivos de la lección |
| `GET` | `/lessons/files/{file_id}/download` | Bearer (matriculado o editor) | Descargar archivo |
| `DELETE` | `/lessons/files/{file_id}` | Bearer (editor) | Eliminar archivo y registro |

Los ficheros se guardan en disco con nombre opaco (`UUID` + extensión) bajo `UPLOAD_DIR` (por defecto `backend/uploads/`; en Docker volumen `/app/uploads`). Variables: `MAX_UPLOAD_BYTES`, `ALLOWED_UPLOAD_MIMES`.

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
| `GET` | `/progress/lesson/{lesson_id}/attempts` | Bearer (**student** o **admin**) | Historial de intentos del alumno autenticado en esa lección (solo test/multiple_selection) |
| `POST` | `/progress/lesson/{lesson_id}/submit` | Bearer (**student**) | Entregar tarea (`assignment`); body `{ body?, file_id? }` |
| `GET` | `/progress/lesson/{lesson_id}/submission` | Bearer (**student**) | Entrega propia en una lección `assignment` |
| `GET` | `/progress/me/performance` | Bearer (**student** o **admin**) | Informe agregado: media global, comparativa por curso vs cohorte, intentos recientes |

**Completar lección:** para `test` y `multiple_selection` el body debe incluir las opciones seleccionadas. Umbral de aprobación: **70 %** (`PASSING_SCORE` en `progress/service.py`). TEXT y VIDEO ignoran el body. Las lecciones `assignment` se completan al calificar con `score >= passing_score` (por defecto 70); ver `progress/submission_service.py`.

**Informe de rendimiento (`/progress/me/performance`):**
- `user_avg_score` por curso: media de `best_score` en lecciones tipo test con al menos un intento.
- `cohort_avg_score`: misma regla aplicada a **todos** los alumnos matriculados en ese curso (media de mejores notas por test).
- `recent_attempts`: últimos 10 intentos del usuario ordenados por `attempted_at` descendente.

### Dashboard — prefijo `/dashboard`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/dashboard/student/me` | **student** o **admin** | Resumen estudiante (rachas, cursos recientes, actividad 7 días) |
| `GET` | `/dashboard/instructor/me` | **instructor** o **admin** | Resumen instructor (cursos con finalización y valoración, alumnos, tops) |
| `GET` | `/dashboard/admin` | **admin** | Métricas globales: finalización, valoración media, distribución por categoría/site/dificultad, cohortes mensuales |

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

No hay seed automático. Para pruebas en **desarrollo** (`ENABLE_DEV_ROUTES=true`):

1. `uv run python -m scripts.bootstrap_admin` — crea administrador (`admin` / `admin@admin` / `admin`).
   - Alternativa: `POST /users/create_admin` en Swagger (solo con rutas dev activas).
2. Login en Swagger → **Authorize** con el access token.
3. `uv run python -m scripts.populate_courses` — importa cursos desde `data_analysis/online_courses_clean.csv`.
   - Alternativa: `POST /courses/populate_courses` (requiere admin y rutas dev).

En **producción** (`ENVIRONMENT=production`, `ENABLE_DEV_ROUTES=false`), usar solo los scripts CLI desde el entorno de despliegue.

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
- Access JWT de corta duración (`EXP_TOKEN` minutos) + refresh tokens opacos en BD con rotación.
- Preguntas de quiz: endpoint **público para estudiantes** oculta `is_correct`; solo `/questions/admin` la expone.

### API HTTP

- Sin prefijo `/api`; el frontend usa `VITE_API_URL` (fallback `http://localhost:8000/`).
- Login: `application/x-www-form-urlencoded` en `/token`.
- Resto: JSON (`application/json`).
- Filtros de lista múltiple: repetir clave en query string (p. ej. `category=business&category=health`).

### Nomenclatura

- Tablas en plural snake_case (`users`, `lesson_progress`).
- Enums de dominio en `model.py` del módulo correspondiente.
- Routers exportados como `*_router` (p. ej. `courses_router`).

---

## Notas para desarrolladores

### Endpoints de desarrollo

Controlados por `ENABLE_DEV_ROUTES` (desactivados por defecto en `ENVIRONMENT=production`):

- `POST /users/create_admin` — bootstrap de admin vía HTTP.
- `POST /courses/populate_courses` — carga masiva desde CSV.

Equivalentes CLI: `uv run python -m scripts.bootstrap_admin` y `uv run python -m scripts.populate_courses`.

### Borrado de cursos

- `DELETE /courses/{course_id}` elimina la fila en `courses`; PostgreSQL aplica `ON DELETE CASCADE` en `lessons`, `enrollments` y `course_ratings`.
- `lesson_progress` se elimina al borrarse la matrícula o la lección (doble FK en cascada).
- `study_activity` no referencia cursos; los agregados diarios del estudiante pueden quedar ligeramente desactualizados tras un borrado (aceptado por diseño).

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
| `assignment` | `body` (instrucciones Markdown); opcional `max_score`, `passing_score`, `allows_file_submission` | POST `/progress/lesson/{id}/submit`; el instructor califica con PATCH `/courses/{id}/submissions/{id}/grade`; aprobación si `score >= passing_score` y no `returned` |

### Paginación de cursos

`core/dependencies.py` centraliza `get_pagination` y el mapa de columnas ordenables. El rating ordenable usa la media calculada en SQL (subquery).

### Integración con el frontend

Ver [api-and-integration.md](../api-and-integration.md): el cliente guarda access y refresh token en `localStorage`, renueva el access con `/token/refresh` ante 401, y trata **404** en `GET /enrollments/me/course/{id}` como “no matriculado”.

### Análisis de datos (`data_analysis/`)

Notebooks y CSV de Kaggle usados para poblar el catálogo inicial. No se importan al arrancar la API; usar `scripts.populate_courses` o el endpoint dev.

### Próximas mejoras sugeridas (no implementadas)

- Rate limiting en `/token/refresh`.
- Cookies httpOnly para refresh tokens.
- Build estático del frontend con nginx en Docker.

---

*Documentación generada a partir de `backend/` (FastAPI, SQLAlchemy, Alembic). Para cambios de esquema, crear siempre una revisión Alembic y documentar la migración en el mensaje de commit.*
