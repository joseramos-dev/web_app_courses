import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { IQuestionAdmin, IQuestionCreate, LessonType } from "../lessonTypes";
import {
    API_createQuestion,
    API_deleteQuestion,
    API_getLessonQuestionsAdmin,
    API_updateQuestion,
} from "../api";
import { runWithToastSaving } from "../../../shared/utils/runWithToastSaving";

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

function cloneEmptyDraft(): Draft {
    return {
        ...emptyDraft,
        options: emptyDraft.options.map((o) => ({ ...o })),
    };
}

function questionToDraft(q: IQuestionAdmin): Draft {
    return {
        prompt: q.prompt,
        options: q.options.map((o) => ({
            text: o.text,
            is_correct: o.is_correct,
            position: o.position,
        })),
    };
}

type ExistingQuestionsPanelProps = {
    lessonId: number;
    refreshKey?: number;
    highlightedQuestionId?: number | null;
    onAdd: () => void;
    onEdit: (question: IQuestionAdmin) => void;
    onDeleted?: () => void;
};

export function ExistingQuestionsPanel({
    lessonId,
    refreshKey = 0,
    highlightedQuestionId = null,
    onAdd,
    onEdit,
    onDeleted,
}: ExistingQuestionsPanelProps) {
    const { t } = useTranslation();
    const [questions, setQuestions] = useState<IQuestionAdmin[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const refresh = async () => {
        const data = await runWithToastSaving(
            setIsLoading,
            () => API_getLessonQuestionsAdmin(lessonId),
            t("courseEdit.toast.questionsLoadFailed"),
        );
        if (data) {
            setQuestions(data);
        }
    };

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonId, refreshKey]);

    const handleDelete = async (id: number) => {
        if (!confirm(t("courseEdit.questions.deleteConfirm"))) return;
        try {
            await API_deleteQuestion(lessonId, id);
            toast.success(t("courseEdit.toast.questionDeleted"));
            await refresh();
            onDeleted?.();
        } catch (e) {
            console.error(e);
            toast.error(t("courseEdit.toast.questionDeleteFailed"));
        }
    };

    return (
        <section className="min-w-0 w-full sm:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {t("courseEdit.questions.existingTitle")}
                </h3>
                <button
                    type="button"
                    onClick={onAdd}
                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    {t("courseEdit.questions.addQuestion")}
                </button>
            </div>

            {isLoading ? (
                <div className="text-sm text-gray-500 dark:text-slate-400">
                    {t("courseEdit.questions.loading")}
                </div>
            ) : questions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-900/30 dark:text-slate-400">
                    {t("courseEdit.questions.empty")}
                </div>
            ) : (
                <div className="max-h-52 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 p-2 dark:border-slate-600">
                    <div className="space-y-2">
                        {questions.map((q) => (
                            <div
                                key={q.id}
                                className={`rounded-lg border p-3 ${
                                    highlightedQuestionId === q.id
                                        ? "border-gray-900 dark:border-uned-primary"
                                        : "border-gray-200 dark:border-slate-600"
                                }`}
                            >
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="text-xs text-gray-500 dark:text-slate-400">
                                            #{q.position}
                                        </div>
                                        <div className="break-words text-sm font-medium text-gray-900 dark:text-slate-100">
                                            {q.prompt}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                            {t("courseEdit.questions.optionsCount", {
                                                count: q.options.length,
                                                correct: q.options.filter((o) => o.is_correct).length,
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(q)}
                                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                        >
                                            {t("courseEdit.edit")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleDelete(q.id)}
                                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                        >
                                            {t("courseEdit.delete")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

type QuestionFormModalProps = {
    lessonId: number;
    /** A `test` lesson is answered with radio buttons, so its answer key must
     *  have exactly one correct option or the question is unanswerable. */
    lessonType: LessonType;
    question: IQuestionAdmin | null;
    onClose: () => void;
    onSaved: () => void;
};

export function QuestionFormModal({
    lessonId,
    lessonType,
    question,
    onClose,
    onSaved,
}: QuestionFormModalProps) {
    const { t } = useTranslation();
    const isEditing = question !== null;
    const [draft, setDraft] = useState<Draft>(() =>
        question ? questionToDraft(question) : cloneEmptyDraft(),
    );
    const [questions, setQuestions] = useState<IQuestionAdmin[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setDraft(question ? questionToDraft(question) : cloneEmptyDraft());
    }, [question]);

    const isSingleChoice = lessonType === "test";

    /** In a single-choice question, ticking one option unticks the rest, which
     *  is what keeps the answer key answerable. */
    const setCorrect = (idx: number, checked: boolean) => {
        if (!isSingleChoice) {
            updateOption(idx, { is_correct: checked });
            return;
        }
        setDraft((prev) => ({
            ...prev,
            options: prev.options.map((opt, i) => ({ ...opt, is_correct: i === idx })),
        }));
    };

    useEffect(() => {
        const load = async () => {
            try {
                const data = await API_getLessonQuestionsAdmin(lessonId);
                setQuestions(data);
            } catch (e) {
                console.error(e);
            }
        };
        void load();
    }, [lessonId]);

    const nextPosition = useMemo(() => {
        if (questions.length === 0) return 1;
        return Math.max(...questions.map((q) => q.position)) + 1;
    }, [questions]);

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
            position: isEditing ? question.position : nextPosition,
            options: draft.options
                .map((o, i) => ({ ...o, position: i + 1 }))
                .filter((o) => o.text.trim().length > 0),
        };
        if (!payload.prompt) {
            toast.error(t("courseEdit.toast.promptRequired"));
            return;
        }
        if (payload.options.length < 2) {
            toast.error(t("courseEdit.toast.minTwoOptions"));
            return;
        }
        const correct = payload.options.filter((o) => o.is_correct).length;
        if (correct === 0) {
            toast.error(t("courseEdit.toast.correctOptionRequired"));
            return;
        }
        if (isSingleChoice && correct !== 1) {
            toast.error(t("courseEdit.toast.testNeedsOneCorrect"));
            return;
        }
        if (lessonType === "multiple_selection" && correct < 2) {
            toast.error(t("courseEdit.toast.multipleNeedsTwoCorrect"));
            return;
        }
        const result = await runWithToastSaving(
            setIsSaving,
            () =>
                question
                    ? API_updateQuestion(lessonId, question.id, payload)
                    : API_createQuestion(lessonId, payload),
            t("courseEdit.toast.questionSaveFailed"),
        );
        if (result) {
            toast.success(
                isEditing
                    ? t("courseEdit.toast.questionUpdated")
                    : t("courseEdit.toast.questionCreated"),
            );
            onSaved();
        }
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-800">
                <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-5 dark:border-slate-600">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            {isEditing
                                ? t("courseEdit.questions.modalTitleEdit")
                                : t("courseEdit.questions.modalTitleNew")}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                            {t("courseEdit.questions.subtitle")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        {t("courseEdit.close")}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    <label className="flex flex-col gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                            {t("courseEdit.questions.promptLabel")}
                        </div>
                        <textarea
                            value={draft.prompt}
                            onChange={(e) =>
                                setDraft((d) => ({ ...d, prompt: e.target.value }))
                            }
                            rows={2}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-uned-accent focus:outline-none focus:ring-2 focus:ring-uned-accent/25 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-uned-accent"
                        />
                    </label>

                    <div className="mt-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                            {t("courseEdit.questions.optionsLabel")}
                        </div>
                        <div className="space-y-2">
                            {draft.options.map((opt, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 dark:border-slate-600 dark:bg-slate-900/40"
                                >
                                    <label className="flex shrink-0 items-center gap-1 text-xs text-gray-600 dark:text-slate-300">
                                        <input
                                            type={isSingleChoice ? "radio" : "checkbox"}
                                            name={isSingleChoice ? "correct-option" : undefined}
                                            checked={opt.is_correct}
                                            onChange={(e) =>
                                                setCorrect(idx, e.target.checked)
                                            }
                                        />
                                        {t("courseEdit.questions.correctOption")}
                                    </label>
                                    <input
                                        value={opt.text}
                                        onChange={(e) =>
                                            updateOption(idx, { text: e.target.value })
                                        }
                                        placeholder={t("courseEdit.questions.optionPlaceholder", {
                                            number: idx + 1,
                                        })}
                                        className="flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:border-uned-accent focus:outline-none focus:ring-2 focus:ring-uned-accent/25 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-uned-accent"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeOption(idx)}
                                        disabled={draft.options.length <= 2}
                                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:dark:bg-slate-800/50 disabled:dark:text-slate-600"
                                    >
                                        {t("courseEdit.questions.removeOption")}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addOption}
                            className="mt-2 inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            {t("courseEdit.questions.addOption")}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-200 p-4 dark:border-slate-600">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        {t("courseEdit.close")}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent"
                    >
                        {isSaving
                            ? t("common.saving")
                            : isEditing
                              ? t("courseEdit.questions.saveChanges")
                              : t("courseEdit.questions.createQuestion")}
                    </button>
                </div>
            </div>
        </div>
    );
}
