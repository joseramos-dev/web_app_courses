// Verifica que solo las lecciones de vídeo usan el layout ancho a pantalla
// completa; el resto de tipos de lección (texto, quiz, tarea...) mantienen
// el layout centrado y estrecho de siempre.
//
//   cd frontend
//   npm test -- lessonPageShellClassName
import { describe, expect, it } from "vitest";

import { lessonPageShellClassName } from "./lessonPageShellClassName";

describe("lessonPageShellClassName", () => {
    it("usa el layout ancho a pantalla completa para lecciones de vídeo", () => {
        expect(lessonPageShellClassName("video")).toBe(
            "w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-12",
        );
    });

    it("usa el layout centrado y estrecho para otros tipos de lección", () => {
        expect(lessonPageShellClassName("text")).toBe("mx-auto max-w-3xl px-4 py-6");
        expect(lessonPageShellClassName("test")).toBe("mx-auto max-w-3xl px-4 py-6");
        expect(lessonPageShellClassName("assignment")).toBe(
            "mx-auto max-w-3xl px-4 py-6",
        );
    });

    it("usa el layout centrado cuando el tipo de lección aún no se conoce", () => {
        expect(lessonPageShellClassName(undefined)).toBe(
            "mx-auto max-w-3xl px-4 py-6",
        );
    });
});
