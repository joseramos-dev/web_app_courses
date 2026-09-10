import { useTranslation } from "react-i18next";
import type { DraftOption } from "../hooks/useQuestionDraft";

type Props = {
    option: DraftOption;
    index: number;
    isSingleChoice: boolean;
    canRemove: boolean;
    onTextChange: (text: string) => void;
    onCorrectChange: (checked: boolean) => void;
    onRemove: () => void;
};

export function QuestionOptionRow({
    option,
    index,
    isSingleChoice,
    canRemove,
    onTextChange,
    onCorrectChange,
    onRemove,
}: Props) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 dark:border-slate-600 dark:bg-slate-900/40">
            <label className="flex shrink-0 items-center gap-1 text-xs text-gray-600 dark:text-slate-300">
                <input
                    type={isSingleChoice ? "radio" : "checkbox"}
                    name={isSingleChoice ? "correct-option" : undefined}
                    checked={option.is_correct}
                    onChange={(e) => onCorrectChange(e.target.checked)}
                />
                {t("courseEdit.questions.correctOption")}
            </label>
            <input
                value={option.text}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder={t("courseEdit.questions.optionPlaceholder", { number: index + 1 })}
                className="flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:border-uned-accent focus:outline-none focus:ring-2 focus:ring-uned-accent/25 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-uned-accent"
            />
            <button
                type="button"
                onClick={onRemove}
                disabled={!canRemove}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:dark:bg-slate-800/50 disabled:dark:text-slate-600"
            >
                {t("courseEdit.questions.removeOption")}
            </button>
        </div>
    );
}
