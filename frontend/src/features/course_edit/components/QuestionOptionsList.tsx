import { useTranslation } from "react-i18next";
import type { Draft, DraftOption } from "../hooks/useQuestionDraft";
import { QuestionOptionRow } from "./QuestionOptionRow";

type Props = {
    options: Draft["options"];
    isSingleChoice: boolean;
    onUpdateOption: (idx: number, patch: Partial<DraftOption>) => void;
    onSetCorrect: (idx: number, checked: boolean) => void;
    onAddOption: () => void;
    onRemoveOption: (idx: number) => void;
};

export function QuestionOptionsList({
    options,
    isSingleChoice,
    onUpdateOption,
    onSetCorrect,
    onAddOption,
    onRemoveOption,
}: Props) {
    const { t } = useTranslation();
    return (
        <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                {t("courseEdit.questions.optionsLabel")}
            </div>
            <div className="space-y-2">
                {options.map((opt, idx) => (
                    <QuestionOptionRow
                        key={idx}
                        option={opt}
                        index={idx}
                        isSingleChoice={isSingleChoice}
                        canRemove={options.length > 2}
                        onTextChange={(text) => onUpdateOption(idx, { text })}
                        onCorrectChange={(checked) => onSetCorrect(idx, checked)}
                        onRemove={() => onRemoveOption(idx)}
                    />
                ))}
            </div>
            <button
                type="button"
                onClick={onAddOption}
                className="mt-2 inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
                {t("courseEdit.questions.addOption")}
            </button>
        </div>
    );
}
