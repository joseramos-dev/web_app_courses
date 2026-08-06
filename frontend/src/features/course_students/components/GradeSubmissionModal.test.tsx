// Test de regresión: el campo "Nota" del modal de corrección permitía
// escribir letras (bug reportado y corregido). Comprobamos que el input
// solo acepta dígitos y un punto decimal.
//
//   cd frontend
//   npm test -- GradeSubmissionModal
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ISubmission } from "../../../shared/interfaces/ISubmission";
import { GradeSubmissionModal } from "./GradeSubmissionModal";

// El modal llama a la API al calificar/devolver; no la necesitamos aquí,
// solo evitamos que intente hacer una petición HTTP real.
vi.mock("../../progress/submissionApi", () => ({
    API_gradeSubmission: vi.fn(),
}));

const baseSubmission: ISubmission = {
    id: 1,
    lesson_id: 1,
    content: "Respuesta del alumno",
    status: "pending",
    score: null,
    feedback: null,
    max_score: 100,
    submitted_at: new Date().toISOString(),
    graded_at: null,
};

function renderModal() {
    render(
        <GradeSubmissionModal
            courseId={1}
            submission={baseSubmission}
            isOpen={true}
            onClose={() => {}}
            onGraded={() => {}}
        />,
    );
    return screen.getByLabelText(/nota|score/i);
}

describe("GradeSubmissionModal - campo de nota", () => {
    it("descarta las letras y conserva solo los dígitos escritos", async () => {
        const user = userEvent.setup();
        const input = renderModal();

        await user.type(input, "abc9de5fg");

        expect(input).toHaveValue("95");
    });

    it("acepta números con un punto decimal", async () => {
        const user = userEvent.setup();
        const input = renderModal();

        await user.type(input, "87.5");

        expect(input).toHaveValue("87.5");
    });

    it("ignora un segundo punto decimal", async () => {
        const user = userEvent.setup();
        const input = renderModal();

        await user.type(input, "8.7.5");

        expect(input).toHaveValue("8.75");
    });
});
