import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { IQuestionAdmin, IQuestionCreate, LessonType } from "../lessonTypes";
import { API_createQuestion, API_updateQuestion } from "../api";
import { runWithToastSaving } from "../../../shared/utils/runWithToastSaving";
import { useQuestionDraft } from "../hooks/useQuestionDraft";
import { validateQuestionDraft } from "../hooks/validateQuestionDraft";
import { useNextQuestionPosition } from "../hooks/useNextQuestionPosition";
import { QuestionOptionsList } from "./QuestionOptionsList";

type Props = {
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
}: Props) {
    const { t } = useTranslation();
    const isEditing = question !== null;
    const { draft, setDraft, isSingleChoice, updateOption, addOption, removeOption, setCorrect } =
        useQuestionDraft(question, lessonType);
    const nextPosition = useNextQuestionPosition(lessonId);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const validationKey = validateQuestionDraft(draft, lessonType);
        if (validationKey) {
            toast.error(t(validationKey));
            return;
        }
        const payload: IQuestionCreate = {
            prompt: draft.prompt.trim(),
            position: isEditing ? question.position : nextPosition,
            options: draft.options
                .map((o, i) => ({ ...o, position: i + 1 }))
                .filter((o) => o.text.trim().length > 0),
        };
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

                    <QuestionOptionsList
                        options={draft.options}
                        isSingleChoice={isSingleChoice}
                        onUpdateOption={updateOption}
                        onSetCorrect={setCorrect}
                        onAddOption={addOption}
                        onRemoveOption={removeOption}
                    />
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
