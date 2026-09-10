import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { IQuestionAdmin } from "../lessonTypes";
import { API_deleteQuestion, API_getLessonQuestionsAdmin } from "../api";
import { runWithToastSaving } from "../../../shared/utils/runWithToastSaving";

type Props = {
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
}: Props) {
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
