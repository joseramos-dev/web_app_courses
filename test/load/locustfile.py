"""Prueba de carga de Kursa con Locust.

Simula alumnos navegando el catálogo, abriendo fichas de curso, pidiendo
recomendaciones, consultando su panel y matriculándose. Las cuentas son las
sembradas por las herramientas de desarrollo (`demo_student_0001`, ...), cuya
contraseña es su propio nombre.

Instrucciones de ejecución en README.md (de esta misma carpeta).
"""

from __future__ import annotations

import random

from locust import HttpUser, between, task

# Valores reales del enum Category (backend/modules/courses/model.py).
CATEGORIES = [
    "business",
    "computer science",
    "data science",
    "health",
    "information technology",
    "language learning",
    "math and logic",
    "personal development",
    "social sciences",
]

SEARCH_TERMS = ["python", "data", "excel", "project", "cloud", "english", "market"]

# Cuentas demo_student_0001..demo_student_0085 sembradas en la base de datos.
DEMO_STUDENTS = 85

PAGE_SIZE = 12


class StudentUser(HttpUser):
    """Un alumno navegando la plataforma."""

    wait_time = between(1, 3)

    def on_start(self) -> None:
        index = random.randint(1, DEMO_STUDENTS)
        account = f"demo_student_{index:04d}"

        # El token se pide una sola vez y se reutiliza: se quiere medir el coste
        # de las páginas, no el del hashing bcrypt del login.
        with self.client.post(
            "/token",
            data={"username": account, "password": account},
            name="POST /token",
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"login fallido ({response.status_code})")
                self.environment.runner.quit()
                return
            self.client.headers["Authorization"] = (
                f"Bearer {response.json()['access_token']}"
            )

        # IDs reales del catálogo, para no inventar identificadores.
        catalogo = self.client.get(
            f"/courses/?limit={PAGE_SIZE * 5}",
            name="GET /courses/ [arranque]",
        )
        self.course_ids = [curso["id"] for curso in catalogo.json()["courses"]]

    @task(10)
    def explorar_catalogo(self) -> None:
        offset = random.randint(0, 20) * PAGE_SIZE
        self.client.get(
            f"/courses/?limit={PAGE_SIZE}&offset={offset}",
            name="GET /courses/ [paginado]",
        )

    @task(6)
    def filtrar_catalogo(self) -> None:
        self.client.get(
            "/courses/",
            params={
                "limit": PAGE_SIZE,
                "category": random.choice(CATEGORIES),
                "search": random.choice(SEARCH_TERMS),
            },
            name="GET /courses/ [filtrado]",
        )

    @task(8)
    def ver_curso(self) -> None:
        if not self.course_ids:
            return
        course_id = random.choice(self.course_ids)
        self.client.get(f"/courses/{course_id}", name="GET /courses/{id}")

    @task(5)
    def pedir_recomendaciones(self) -> None:
        self.client.get("/recommendations/me?limit=8", name="GET /recommendations/me")

    @task(4)
    def ver_panel(self) -> None:
        self.client.get("/dashboard/student/me", name="GET /dashboard/student/me")

    @task(1)
    def matricularse(self) -> None:
        if not self.course_ids:
            return
        course_id = random.choice(self.course_ids)
        # La matriculación es idempotente: repetirla sobre el mismo curso
        # devuelve la matrícula existente, así que no genera errores falsos.
        self.client.post(
            f"/enrollments/{course_id}", name="POST /enrollments/{id}"
        )
