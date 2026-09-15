# Tests de Kursa

Resumen de toda la suite de pruebas del proyecto y los comandos para
ejecutarla. Todos los comandos son "copy-paste": se lanzan desde la raíz
del repositorio.

`test/` está organizado en las mismas 4 categorías que el apartado de
pruebas de la memoria, para que el código y el documento se puedan leer en
paralelo:

```
test/
  unit/          1. Test unitarios
  flows/         2. Flujo completo          (guion manual, sin automatizar)
  recommender/   3. Test del recomendador
  load/          4. Pruebas de carga        (Locust)
```

Por eso la suite no cubre toda la aplicación (auth, notificaciones, subida
de ficheros, etc. tenían tests en algún momento): se ha recortado a
propósito a lo que la memoria va a documentar, en vez de mantener una
suite de ingeniería aparte del texto.

## Backend (pytest)

Todos los tests de Python viven en esta carpeta (`test/`), fuera de
`backend/`, e importan los módulos del backend a través del `sys.path` que
añade `conftest.py` (vale también para los tests dentro de subcarpetas
como `unit/` o `recommender/`, `conftest.py` se carga igual). Se ejecutan
siempre desde `backend/` para que las rutas relativas (`.env`,
`data_analysis/...`) se resuelvan igual que al arrancar el servidor.

### Ejecutar toda la suite backend

```powershell
cd backend
.venv\Scripts\python.exe -m pytest ../test/ -v
```

(equivalente con `uv`: `cd backend; uv run pytest ../test/ -v`)

### Ejecutar solo una categoría o un archivo

```powershell
cd backend
.venv\Scripts\python.exe -m pytest ../test/unit/ -v
.venv\Scripts\python.exe -m pytest ../test/unit/test_security.py -v
```

### Tipos de test incluidos

| Archivo | Tipo | Qué comprueba |
|---|---|---|
| `unit/test_security.py` | Unitario | `hash_password`/`verify_password`/`create_access_token`: hashing, truncado a 72 bytes de bcrypt, payload y expiración del JWT. Nada de BD ni HTTP. |
| `unit/test_course_permissions.py` | Unitario | `assert_can_manage_course`: qué rol puede gestionar qué curso (admin siempre, instructor solo el suyo, estudiante nunca, curso inexistente da 404). |
| `unit/test_grading.py` | Unitario | `_grade_test`: una pregunta solo cuenta como acierto si se marca el conjunto exacto de opciones correctas; lección sin preguntas se da por aprobada. |
| `unit/test_progress_race_condition.py` | Unitario (mocks) | Regresión: dos peticiones concurrentes creando el mismo progreso de lección no deben propagar un `IntegrityError` como 500. |
| `recommender/test_content_recommender.py`, `recommender/test_history_recommender.py`, `recommender/test_collaborative_recommender.py` | Unitario (mocks) | Algoritmo del recomendador: puntuaciones, pesos, ratios de coincidencia. No tocan una BD real. |

`conftest.py` no es un test en sí: define las fixtures compartidas (`db`,
`client`) y los helpers (`make_user`, `make_course`, ...) que usan (o
usarán) los tests de `flows/` y `load/`.

## Frontend (Vitest + React Testing Library)

```powershell
cd frontend
npm test
```

Para dejarlo corriendo en modo watch mientras desarrollas:

```powershell
cd frontend
npm run test:watch
```

Para ejecutar solo un archivo:

```powershell
cd frontend
npm test -- useExpandableList
```

### Tests incluidos

| Archivo | Qué comprueba |
|---|---|
| `src/features/course_edit/hooks/validateQuestionDraft.test.ts` | Reglas del formulario de preguntas: enunciado no vacío, mínimo 2 opciones con texto, al menos una correcta, y exactamente una correcta en `test` frente a dos o más en `multiple_selection`. |
| `src/features/dashboard/components/useExpandableList.test.ts` | Hook de "mostrar más": colapsa/expande la lista, detecta cuándo no hace falta botón. |
| `src/features/course_students/components/GradeSubmissionModal.test.tsx` | Regresión: el campo "Nota" descarta letras y acepta decimales. |
| `src/features/lesson/components/lessonPageShellClassName.test.ts` | Solo las lecciones de vídeo usan el layout ancho a pantalla completa. |

## Qué falta

- `flows/` (sección 2 de la memoria): el guion manual con los pasos a
  seguir, las capturas a tomar y el texto para la memoria ya está en
  [`flows/GUION.md`](flows/GUION.md). Falta ejecutarlo a mano y decidir
  si alguno de los 3 flujos merece automatizarse más adelante.
- `recommender/`: pendiente añadir un test en un entorno más limitado
  (pocos cursos/usuarios) que permita observar a simple vista si las
  recomendaciones tienen sentido, más allá de los mocks actuales.
