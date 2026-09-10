import { useTranslation } from "react-i18next";
import { ActivityBarChart } from "../../../shared/components/charts/ActivityBarChart";
import type { ChartDatum } from "../../../shared/components/charts/chartTheme";
import type { IDailyActivity } from "../../../shared/interfaces/IDashboard";

type Props = {
    activitySeries: IDailyActivity[];
    chartData: ChartDatum[];
    /** Locale-aware short date formatter, shared with usePublicStats so tooltip and footer dates match. */
    dayFormatter: Intl.DateTimeFormat;
};

/** Daily completed-lessons activity chart, with a first/last date footer. */
export function ActivityChartSection({ activitySeries, chartData, dayFormatter }: Props) {
    const { t } = useTranslation();

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                {t("landing.lessonsPerDayTitle")}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {t("landing.lessonsPerDaySubtitle")}
            </p>
            <div className="mt-4">
                <ActivityBarChart
                    height={140}
                    hideXLabels={activitySeries.length > 7}
                    data={chartData}
                />
                {activitySeries.length > 1 && (
                    <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-slate-500">
                        <span>
                            {dayFormatter.format(new Date(activitySeries[0].date))}
                        </span>
                        <span>
                            {dayFormatter.format(
                                new Date(
                                    activitySeries[activitySeries.length - 1].date,
                                ),
                            )}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
