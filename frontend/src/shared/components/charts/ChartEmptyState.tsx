import { useTranslation } from "react-i18next";

export function ChartEmptyState() {
    const { t } = useTranslation();
    return (
        <div className="flex h-24 items-center justify-center text-xs text-gray-400 dark:text-slate-500">
            {t("charts.noData")}
        </div>
    );
}
