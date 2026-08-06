import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
    canExpand: boolean;
    isExpanded: boolean;
    hiddenCount: number;
    onToggle: () => void;
};

export function ShowMoreToggle({
    canExpand,
    isExpanded,
    hiddenCount,
    onToggle,
}: Props) {
    const { t } = useTranslation();
    if (!canExpand) return null;

    return (
        <button
            type="button"
            onClick={onToggle}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
            {isExpanded ? (
                <>
                    {t("common.showLess")}
                    <ChevronUp className="size-3.5" aria-hidden />
                </>
            ) : (
                <>
                    {t("common.showMore", { count: hiddenCount })}
                    <ChevronDown className="size-3.5" aria-hidden />
                </>
            )}
        </button>
    );
}
