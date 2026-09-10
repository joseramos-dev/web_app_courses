// Comprueba las reglas del formulario de preguntas: prompt no vacío, al
// menos 2 opciones con texto, al menos una correcta, y las reglas propias de
// cada tipo de lección (test: exactamente una correcta; multiple_selection:
// al menos dos).
//
//   cd frontend
//   npm test -- validateQuestionDraft
import { describe, expect, it } from "vitest";

import { validateQuestionDraft } from "./validateQuestionDraft";
import type { Draft } from "./useQuestionDraft";

function draft(overrides: Partial<Draft> = {}): Draft {
    return {
        prompt: "¿Cuál es la capital de Francia?",
        options: [
            { text: "Madrid", is_correct: false, position: 1 },
            { text: "París", is_correct: true, position: 2 },
        ],
        ...overrides,
    };
}

describe("validateQuestionDraft", () => {
    it("acepta un draft válido para un test (una sola correcta)", () => {
        expect(validateQuestionDraft(draft(), "test")).toBeNull();
    });

    it("rechaza un prompt vacío", () => {
        expect(validateQuestionDraft(draft({ prompt: "   " }), "test")).toBe(
            "courseEdit.toast.promptRequired",
        );
    });

    it("rechaza menos de 2 opciones con texto", () => {
        expect(
            validateQuestionDraft(
                draft({
                    options: [{ text: "Única", is_correct: true, position: 1 }],
                }),
                "test",
            ),
        ).toBe("courseEdit.toast.minTwoOptions");
    });

    it("ignora las opciones sin texto al contar el mínimo", () => {
        expect(
            validateQuestionDraft(
                draft({
                    options: [
                        { text: "Madrid", is_correct: false, position: 1 },
                        { text: "París", is_correct: true, position: 2 },
                        { text: "   ", is_correct: false, position: 3 },
                    ],
                }),
                "test",
            ),
        ).toBeNull();
    });

    it("rechaza si ninguna opción está marcada como correcta", () => {
        expect(
            validateQuestionDraft(
                draft({
                    options: [
                        { text: "Madrid", is_correct: false, position: 1 },
                        { text: "París", is_correct: false, position: 2 },
                    ],
                }),
                "test",
            ),
        ).toBe("courseEdit.toast.correctOptionRequired");
    });

    it("un test rechaza más de una opción correcta", () => {
        expect(
            validateQuestionDraft(
                draft({
                    options: [
                        { text: "Madrid", is_correct: true, position: 1 },
                        { text: "París", is_correct: true, position: 2 },
                    ],
                }),
                "test",
            ),
        ).toBe("courseEdit.toast.testNeedsOneCorrect");
    });

    it("multiple_selection exige al menos dos correctas", () => {
        expect(validateQuestionDraft(draft(), "multiple_selection")).toBe(
            "courseEdit.toast.multipleNeedsTwoCorrect",
        );
        expect(
            validateQuestionDraft(
                draft({
                    options: [
                        { text: "Madrid", is_correct: true, position: 1 },
                        { text: "París", is_correct: true, position: 2 },
                    ],
                }),
                "multiple_selection",
            ),
        ).toBeNull();
    });
});
