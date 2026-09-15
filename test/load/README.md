# Pruebas de carga (Locust)

Miden cómo responde la API cuando varios alumnos la usan a la vez. El escenario está
en [`locustfile.py`](locustfile.py): cada usuario virtual inicia sesión una vez con una
cuenta sembrada y a partir de ahí navega el catálogo, abre fichas de curso, pide
recomendaciones, consulta su panel y se matricula.

## Requisitos previos

1. **Datos sembrados.** Entra como admin en `/admin` y usa las herramientas de
   desarrollo para sembrar cursos y cuentas. El escenario asume que existen al menos
   85 cuentas `demo_student_XXXX` (la contraseña de cada una es su propio nombre).
2. **Backend contra PostgreSQL**, no SQLite, para que las cifras signifiquen algo.
3. **Limitador de peticiones desactivado.** Es imprescindible: hay un límite global de
   200 peticiones por minuto y por IP, y `GET /recommendations/me` tiene otro propio de
   10 por minuto. Como todos los usuarios virtuales salen de la misma IP, sin
   desactivarlo se estaría midiendo slowapi en lugar de la aplicación.

Arranque del backend para una sesión de medición:

```bash
cd backend
RATE_LIMIT_ENABLED=false .venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Ejecutar

Interfaz web de Locust (útil para explorar):

```bash
cd backend
uv run locust -f ../test/load/locustfile.py --host http://127.0.0.1:8000
```

Ejecución sin interfaz, que es la que genera los informes de la memoria:

```bash
cd backend
uv run locust -f ../test/load/locustfile.py --host http://127.0.0.1:8000 --headless -u 50 -r 5 -t 3m --csv ../test/load/resultados/carga_50u --html ../test/load/resultados/carga_50u.html
```

`-u` es el número de usuarios concurrentes, `-r` cuántos se incorporan por segundo y
`-t` la duración. Las mediciones de la memoria se tomaron con tres rampas: 10, 50 y 100
usuarios, tres minutos cada una.

## Resultados

Quedan en `resultados/`, con un `.html` por rampa (incluye las gráficas) y los `.csv`
de estadísticas. Las cifras del capítulo de pruebas de la memoria salen de ahí.
