import { useTranslation } from "react-i18next";
import { DistributionBarChart } from "../../../shared/components/charts/DistributionBarChart";
import type { ChartDatum } from "../../../shared/components/charts/chartTheme";
import type { PublicStatsPeriod } from "../../../shared/types/LessonTypes";
import { PERIOD_HELPER_KEY } from "../hooks/usePublicStats";

type Props = {
    chartData: ChartDatum[];
    period: PublicStatsPeriod;
};

/** Lessons completed in the selected period, broken down by lesson type. */
export function LessonTypeChartSection({ chartData, period }: Props) {
    const { t } = useTranslation();

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                {t("landing.completedByTypeTitle")}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {t("landing.completedByTypeSubtitle", {
                    period: t(PERIOD_HELPER_KEY[period]).toLowerCase(),
                })}
            </p>
            <div className="mt-4">
                <DistributionBarChart data={chartData} height={200} />
            </div>
        </div>
    );
}
