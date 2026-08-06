# Tests de Kursa

Resumen de toda la suite de pruebas del proyecto y los comandos para
ejecutarla. Todos los comandos son "copy-paste": se lanzan desde la raíz
del repositorio.

## Backend (pytest)

Todos los tests de Python viven en esta carpeta (`test/`), fuera de
`backend/`, e importan los módulos del backend añadiendo `backend/` al
`sys.path`. Se ejecutan siempre desde `backend/` para que las rutas
relativas (`.env`, `data_analysis/...`) se resuelvan igual que al arrancar
el servidor.

### Ejecutar toda la suite backend

```powershell
cd backend
.venv\Scripts\python.exe -m pytest ../test/ -v
```

(equivalente con `uv`: `cd backend; uv run pytest ../test/ -v`)

### Ejecutar solo un archivo

```powershell
cd backend
.venv\Scripts\python.exe -m pytest ../test/test_api_auth.py -v
```

### Tipos de test incluidos

| Archivo | Tipo | Qué comprueba |
|---|---|---|
| `test_content_recommender.py`, `test_history_recommender.py`, `test_collaborative_recommender.py` | Unitario (mocks) | Algoritmo del recomendador: puntuaciones, pesos, ratios de coincidencia. No tocan una BD real. |
| `test_integration_db.py` | Integración con BD | Queries y recálculos reales contra una BD SQLite en memoria (progreso de matrícula, filtros del catálogo, cascadas de borrado). |
| `test_api_auth.py` | API end-to-end | Peticiones HTTP reales sobre la app FastAPI (`TestClient`): registro, login, bloqueo de cuenta, permisos por rol. |
| `test_regression_bugs.py` | Regresión | Un test por cada bug ya corregido (auto-democión de admin, `bootstrap_admin`, race condition de progreso), para detectar si alguien lo reintroduce. |

`conftest.py` no es un test en sí: define las fixtures compartidas (`db`,
`client`) y los helpers (`make_user`, `make_course`, ...) que usan los tests
de integración, de API y de regresión.

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
| `src/features/dashboard/components/useExpandableList.test.ts` | Hook de "mostrar más": colapsa/expande la lista, detecta cuándo no hace falta botón. |
| `src/features/course_students/components/GradeSubmissionModal.test.tsx` | Regresión: el campo "Nota" descarta letras y acepta decimales. |
| `src/features/lesson/components/lessonPageShellClassName.test.ts` | Solo las lecciones de vídeo usan el layout ancho a pantalla completa. |

## Qué más se podría añadir

Ver la explicación completa en el chat, en resumen:

- Unitarios de `security.py`, `_grade_test`, `assert_can_manage_course`.
- Más integración con BD (dashboard, entregas, recomendador con datos reales).
- Más API end-to-end (matrícula, quiz, entregas, subida de ficheros).
- E2E de navegador (Playwright/Cypress) para 2-3 flujos críticos completos.
