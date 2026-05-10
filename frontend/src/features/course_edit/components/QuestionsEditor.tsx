import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { IQuestionAdmin, IQuestionCreate } from "../lessonTypes";
import {
    API_createQuestion,
    API_deleteQuestion,
    API_getLessonQuestionsAdmin,
    API_updateQuestion,
} from "../api";

type Props = {
    lessonId: number;
    onClose: () => void;
};

type DraftOption = {
    text: string;
    is_correct: boolean;
    position: number;
};

type Draft = {
    prompt: string;
    options: DraftOption[];
};

const emptyDraft: Draft = {
    prompt: "",
    options: [
        { text: "", is_correct: false, position: 1 },
        { text: "", is_correct: false, position: 2 },
    ],
};

export function QuestionsEditor({ lessonId, onClose }: Props) {
    const [questions, setQuestions] = useState<IQuestionAdmin[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Draft>(emptyDraft);

    const refresh = async () => {
        try {
            setIsLoading(true);
            const data = await API_getLessonQuestionsAdmin(lessonId);
            setQuestions(data);
        } catch (e) {
            console.error(e);
            toast.error("No se pudieron cargar las preguntas.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonId]);

    const nextPosition = useMemo(() => {
        if (questions.length === 0) return 1;
        return Math.max(...questions.map((q) => q.position)) + 1;
    }, [questions]);

    const startNew = () => {
        setEditingId(null);
        setDraft({ ...emptyDraft, options: emptyDraft.options.map((o) => ({ ...o })) });
    };

    const startEdit = (q: IQuestionAdmin) => {
        setEditingId(q.id);
        setDraft({
            prompt: q.prompt,
            options: q.options.map((o) => ({
                text: o.text,
                is_correct: o.is_correct,
                position: o.position,
            })),
        });
    };

    const updateOption = (idx: number, patch: Partial<DraftOption>) => {
        setDraft((d) => ({
            ...d,
            options: d.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
        }));
    };

    const addOption = () => {
        setDraft((d) => ({
            ...d,
            options: [
                ...d.options,
                {
                    text: "",
                    is_correct: false,
                    position: d.options.length + 1,
                },
            ],
        }));
    };

    const removeOption = (idx: number) => {
        setDraft((d) => ({
            ...d,
            options: d.options
                .filter((_, i) => i !== idx)
                .map((o, i) => ({ ...o, position: i + 1 })),
        }));
    };

    const handleSave = async () => {
        const payload: IQuestionCreate = {
            prompt: draft.prompt.trim(),
            position: editingId
                ? questions.find((q) => q.id === editingId)?.position ?? nextPosition
                : nextPosition,
            options: draft.options
                .map((o, i) => ({ ...o, position: i + 1 }))
                .filter((o) => o.text.trim().length > 0),
        };
        if (!payload.prompt) {
            toast.error("La pregunta no puede estar vacía.");
            return;
        }
        if (payload.options.length < 2) {
            toast.error("Necesitas al menos 2 opciones.");
            return;
        }
        if (!payload.options.some((o) => o.is_correct)) {
            toast.error("Marca al menos una opción correcta.");
            return;
        }
        try {
            if (editingId) {
                await API_updateQuestion(lessonId, editingId, payload);
                toast.success("Pregunta actualizada");
            } else {
                await API_createQuestion(lessonId, payload);
                toast.success("Pregunta creada");
            }
            await refresh();
            startNew();
        } catch (e) {
            console.error(e);
            toast.error("No se pudo guardar la pregunta.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar esta pregunta?")) return;
        try {
            await API_deleteQuestion(lessonId, id);
            toast.success("Pregunta eliminada");
            await refresh();
            if (editingId === id) startNew();
        } catch (e) {
            console.error(e);
            toast.error("No se pudo eliminar la pregunta.");
        }
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-800">
                <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-5 dark:border-slate-600">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            Editar preguntas
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                            Define preguntas y opciones. Marca la(s) opción(es)
                            correcta(s).
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    <section className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                            Preguntas existentes
                        </h3>
                        {isLoading ? (
                            <div className="mt-2 text-sm text-gray-500 dark:text-slate-400">Cargando…</div>
                        ) : questions.length === 0 ? (
                            <div className="mt-2 rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-900/30 dark:text-slate-400">
                                Aún no hay preguntas. Crea la primera abajo.
                            </div>
                        ) : (
                            <div className="mt-2 space-y-2">
                                {questions.map((q) => (
                                    <div
                                        key={q.id}
                                        className={`rounded-lg border p-3 ${editingId === q.id
                                                ? "border-gray-900 dark:border-uned-primary"
                                                : "border-gray-200 dark:border-slate-600"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                                    #{q.position}
                                                </div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                                    {q.prompt}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                                    {q.options.length} opciones ·{" "}
                                                    {q.options.filter((o) => o.is_correct).length}{" "}
                                                    correcta(s)
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(q)}
                                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(q.id)}
                                                    className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                                >
                                                    Borrar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                {editingId ? "Editar pregunta" : "Nueva pregunta"}
                            </h3>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={startNew}
                                    className="text-xs text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100"
                                >
                                    Cancelar edición
                                </button>
                            )}
                        </div>

                        <label className="flex flex-col gap-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                                Enunciado
                            </div>
                            <textarea
                                value={draft.prompt}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, prompt: e.target.value }))
                                }
                                rows={2}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                            />
                        </label>

                        <div className="mt-4">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                                Opciones
                            </div>
                            <div className="space-y-2">
                                {draft.options.map((opt, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 dark:border-slate-600 dark:bg-slate-900/40"
                                    >
                                        <label className="flex shrink-0 items-center gap-1 text-xs text-gray-600 dark:text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={opt.is_correct}
                                                onChange={(e) =>
                                                    updateOption(idx, {
                                                        is_correct: e.target.checked,
                                                    })
                                                }
                                            />
                                            Correcta
                                        </label>
                                        <input
                                            value={opt.text}
                                            onChange={(e) =>
                                                updateOption(idx, { text: e.target.value })
                                            }
                                            placeholder={`Opción ${idx + 1}`}
                                            className="flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeOption(idx)}
                                            disabled={draft.options.length <= 2}
                                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:dark:bg-slate-800/50 disabled:dark:text-slate-600"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={addOption}
                                className="mt-2 inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                Añadir opción
                            </button>
                        </div>
                    </section>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-200 p-4 dark:border-slate-600">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        Cerrar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent"
                    >
                        {editingId ? "Guardar cambios" : "Crear pregunta"}
                    </button>
                </div>
            </div>
        </div>
    );
}
