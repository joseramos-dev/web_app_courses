import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DistributionBarChart } from "../../../shared/components/charts/DistributionBarChart";
import { formatCategoryLabel } from "../../../shared/components/charts/chartFormatters";
import type { ChartDatum } from "../../../shared/components/charts/chartTheme";
import type { ICategoryStat } from "../../../shared/interfaces/IDashboard";

type Props = {
    categoryDistribution: ICategoryStat[];
    chartData: ChartDatum[];
    totalCategoryEnrollments: number;
};

/** Enrollment distribution across course categories, with quick category links. */
export function CategoryDistributionSection({
    categoryDistribution,
    chartData,
    totalCategoryEnrollments,
}: Props) {
    const { t } = useTranslation();

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                {t("landing.categoryTitle")}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {totalCategoryEnrollments > 0
                    ? t("landing.categorySubtitleWithTotal", {
                          total: totalCategoryEnrollments,
                      })
                    : t("landing.categorySubtitleNoTotal")}
            </p>
            <div className="mt-4">
                <DistributionBarChart data={chartData} height={200} />
            </div>
            {categoryDistribution.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {categoryDistribution.slice(0, 5).map((c) => (
                        <Link
                            key={c.category}
                            to={`/courses?category=${encodeURIComponent(c.category)}`}
                            className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition hover:border-uned-primary hover:text-uned-primary dark:border-slate-600 dark:text-slate-300"
                        >
                            {formatCategoryLabel(c.category, t)}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
