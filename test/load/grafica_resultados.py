"""Genera la gráfica de resultados de las pruebas de carga para la memoria.

Lee los CSV que produce Locust en `resultados/` y dibuja dos paneles: el
rendimiento agregado por nivel de concurrencia y el percentil 95 de cada
endpoint. La imagen se escribe directamente en la carpeta de imágenes de la
memoria.

    cd backend
    uv run python ../test/load/grafica_resultados.py
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

AQUI = Path(__file__).resolve().parent
RESULTADOS = AQUI / "resultados"
SALIDA = (
    AQUI.parent.parent
    / "docs"
    / "Plantilla PFG ETSI Informática UNED"
    / "imagenes"
    / "30-Pruebas_carga.png"
)

NIVELES = (10, 50, 100)

# Nombre en el CSV -> etiqueta en la gráfica. Se deja fuera POST /token, que solo
# se ejecuta una vez por usuario al arrancar, y la petición de arranque.
ENDPOINTS = {
    "GET /courses/ [paginado]": "Catálogo",
    "GET /courses/ [filtrado]": "Catálogo filtrado",
    "GET /courses/{id}": "Ficha de curso",
    "GET /dashboard/student/me": "Panel del alumno",
    "GET /recommendations/me": "Recomendaciones",
    "POST /enrollments/{id}": "Matriculación",
}

VERDE = "#1f7a3f"
VERDE_CLARO = "#5aab77"
GRIS = "#4d4d4d"


def leer(nivel: int) -> dict[str, dict[str, str]]:
    ruta = RESULTADOS / f"carga_{nivel}u_stats.csv"
    with ruta.open(newline="", encoding="utf-8") as fh:
        return {fila["Name"]: fila for fila in csv.DictReader(fh)}


def main() -> None:
    datos = {nivel: leer(nivel) for nivel in NIVELES}

    fig, (izq, der) = plt.subplots(1, 2, figsize=(11, 4.2))

    # Panel izquierdo: throughput y latencia agregada frente a concurrencia.
    rps = [float(datos[n]["Aggregated"]["Requests/s"]) for n in NIVELES]
    p95 = [float(datos[n]["Aggregated"]["95%"]) for n in NIVELES]
    mediana = [float(datos[n]["Aggregated"]["Median Response Time"]) for n in NIVELES]

    x = range(len(NIVELES))
    izq.bar(x, rps, color=VERDE, width=0.5, label="Peticiones por segundo")
    izq.set_xticks(list(x))
    izq.set_xticklabels([f"{n} usuarios" for n in NIVELES])
    izq.set_ylabel("Peticiones por segundo")
    izq.set_ylim(0, max(rps) * 1.35)
    # Las etiquetas van dentro de la barra: encima chocarían con la línea de
    # mediana en el nivel de 10 usuarios, donde la barra es muy baja.
    for i, valor in enumerate(rps):
        izq.text(
            i,
            valor - max(rps) * 0.05,
            f"{valor:.1f}",
            ha="center",
            va="top",
            fontsize=9,
            color="white",
            fontweight="bold",
        )

    latencia = izq.twinx()
    latencia.plot(x, p95, color=GRIS, marker="o", label="Percentil 95 (ms)")
    latencia.plot(
        x, mediana, color=GRIS, marker="s", linestyle="--", label="Mediana (ms)"
    )
    latencia.set_ylabel("Tiempo de respuesta (ms)")
    latencia.set_ylim(0, max(p95) * 2)

    izq.set_title("Rendimiento agregado por nivel de concurrencia", fontsize=10)
    lineas, etiquetas = latencia.get_legend_handles_labels()
    izq.legend(
        [izq.patches[0]] + lineas,
        ["Peticiones por segundo"] + etiquetas,
        fontsize=8,
        loc="upper left",
    )

    # Panel derecho: percentil 95 por endpoint en cada nivel.
    etiquetas_ep = list(ENDPOINTS.values())
    ancho = 0.26
    posiciones = range(len(etiquetas_ep))
    colores = {10: VERDE_CLARO, 50: VERDE, 100: GRIS}
    for desplazamiento, nivel in zip((-ancho, 0, ancho), NIVELES):
        valores = [
            float(datos[nivel][clave]["95%"]) if clave in datos[nivel] else 0.0
            for clave in ENDPOINTS
        ]
        der.bar(
            [p + desplazamiento for p in posiciones],
            valores,
            width=ancho,
            color=colores[nivel],
            label=f"{nivel} usuarios",
        )

    der.set_xticks(list(posiciones))
    der.set_xticklabels(etiquetas_ep, rotation=30, ha="right", fontsize=8)
    der.set_ylabel("Percentil 95 (ms)")
    der.set_title("Percentil 95 por endpoint", fontsize=10)
    der.legend(fontsize=8)

    for eje in (izq, der, latencia):
        eje.spines["top"].set_visible(False)
    der.grid(axis="y", alpha=0.25)

    fig.tight_layout()
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(SALIDA, dpi=200)
    print(f"Escrita {SALIDA}")


if __name__ == "__main__":
    main()
