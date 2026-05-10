import { useMemo, useState } from "react";
import type { IQuestionPublic } from "../../course_edit/lessonTypes";
import type { ILessonAnswer } from "../api";

type Props = {
    questions: IQuestionPublic[];
    /** "single" allows one option per question, "multiple" allows many. */
    mode: "single" | "multiple";
    submitting: boolean;
    onSubmit: (answers: ILessonAnswer[]) => void;
    /** Optional last attempt score to show feedback. */
    lastScore?: number | null;
};

export function LessonQuiz({
    questions,
    mode,
    submitting,
    onSubmit,
    lastScore,
}: Props) {
    // selected[questionId] = Set<optionId>
    const [selected, setSelected] = useState<Record<number, Set<number>>>(() => {
        const initial: Record<number, Set<number>> = {};
        for (const q of questions) initial[q.id] = new Set<number>();
        return initial;
    });

    const allAnswered = useMemo(() => {
        return questions.every((q) => (selected[q.id]?.size ?? 0) > 0);
    }, [questions, selected]);

    const toggle = (questionId: number, optionId: number) => {
        setSelected((prev) => {
            const next = { ...prev };
            const set = new Set(next[questionId] ?? []);
            if (mode === "single") {
                set.clear();
                set.add(optionId);
            } else {
                if (set.has(optionId)) set.delete(optionId);
                else set.add(optionId);
            }
            next[questionId] = set;
            return next;
        });
    };

    const handleSubmit = () => {
        const answers: ILessonAnswer[] = questions.map((q) => ({
            question_id: q.id,
            selected_option_ids: Array.from(selected[q.id] ?? []),
        }));
        onSubmit(answers);
    };

    if (questions.length === 0) {
        return (
            <div className="space-y-4 rounded-xl border border-dashed border-gray-300 bg-surface-muted p-6 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <p>Esta lección no tiene preguntas. Puedes marcarla como completada para seguir.</p>
                <div className="flex justify-end">
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => onSubmit([])}
                        className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:bg-green-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
                    >
                        {submitting ? "Marcando…" : "Marcar lección como completada"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {lastScore !== null && lastScore !== undefined && (
                <div
                    className={`rounded-xl border p-4 text-sm ${lastScore >= 70
                            ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300"
                            : "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/40 dark:text-yellow-200"
                        }`}
                >
                    Tu última puntuación: {Math.round(lastScore)}%
                    {lastScore < 70 && " — necesitas al menos 70% para superar la lección."}
                </div>
            )}

            {questions.map((q, idx) => (
                <div
                    key={q.id}
                    className="rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800"
                >
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                        Pregunta {idx + 1}
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
                        {q.prompt}
                    </div>
                    <div className="mt-3 space-y-2">
                        {q.options.map((opt) => {
                            const isSelected =
                                selected[q.id]?.has(opt.id) ?? false;
                            return (
                                <label
                                    key={opt.id}
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isSelected
                                            ? "border-gray-900 bg-gray-50 dark:border-uned-primary dark:bg-slate-900/80"
                                            : "border-gray-200 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700/50"
                                        }`}
                                >
                                    <input
                                        type={mode === "single" ? "radio" : "checkbox"}
                                        name={`question-${q.id}`}
                                        checked={isSelected}
                                        onChange={() => toggle(q.id, opt.id)}
                                        className="size-4"
                                    />
                                    <span className="text-gray-800 dark:text-slate-200">{opt.text}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="flex justify-end">
                <button
                    type="button"
                    disabled={submitting || !allAnswered}
                    onClick={handleSubmit}
                    className="inline-flex items-center rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent disabled:dark:border-slate-600 disabled:dark:bg-slate-700 disabled:dark:text-slate-500"
                >
                    {submitting ? "Enviando…" : "Enviar respuestas"}
                </button>
            </div>
        </div>
    );
}
