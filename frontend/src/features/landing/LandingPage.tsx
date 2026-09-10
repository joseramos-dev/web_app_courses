import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    getPublicStatsPeriodLabels,
    type PublicStatsPeriod,
} from "../../shared/types/LessonTypes";
import { PERIOD_HELPER_KEY, usePublicStats } from "./hooks/usePublicStats";
import { LandingSkeleton } from "./components/LandingSkeleton";
import { HeroSection } from "./components/HeroSection";
import { StatsSection } from "./components/StatsSection";
import { PopularCoursesSection } from "./components/PopularCoursesSection";
import { CategoryDistributionSection } from "./components/CategoryDistributionSection";
import { ActivityChartSection } from "./components/ActivityChartSection";
import { LessonTypeChartSection } from "./components/LessonTypeChartSection";

export function LandingPage() {
    const { t } = useTranslation();
    const publicStatsPeriodLabels = getPublicStatsPeriodLabels(t);
    const [period, setPeriod] = useState<PublicStatsPeriod>("week");
    const {
        data,
        loading,
        error,
        dayFormatter,
        totalCategoryEnrollments,
        categoryChartData,
        lessonTypeChartData,
        activityChartData,
    } = usePublicStats(period);

    return (
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            <HeroSection />

            <section className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            {t("landing.activityTitle")}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            {t(PERIOD_HELPER_KEY[period])}
                        </p>
                    </div>
                    <div
                        className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
                        role="tablist"
                        aria-label={t("landing.periodAriaLabel")}
                    >
                        {(Object.keys(publicStatsPeriodLabels) as PublicStatsPeriod[]).map(
                            (key) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={period === key}
                                    onClick={() => setPeriod(key)}
                                    className={[
                                        "rounded-md px-3 py-1.5 text-sm font-medium transition",
                                        period === key
                                            ? "bg-uned-primary text-white"
                                            : "text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700",
                                    ].join(" ")}
                                >
                                    {publicStatsPeriodLabels[key]}
                                </button>
                            ),
                        )}
                    </div>
                </div>
            </section>

            {loading ? (
                <LandingSkeleton />
            ) : error || !data ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error ?? t("dashboard.noData")}
                </div>
            ) : (
                <>
                    <StatsSection data={data} period={period} />

                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <PopularCoursesSection topCourses={data.top_courses} />
                        <CategoryDistributionSection
                            categoryDistribution={data.category_distribution}
                            chartData={categoryChartData}
                            totalCategoryEnrollments={totalCategoryEnrollments}
                        />
                    </section>

                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ActivityChartSection
                            activitySeries={data.activity_series}
                            chartData={activityChartData}
                            dayFormatter={dayFormatter}
                        />
                        <LessonTypeChartSection
                            chartData={lessonTypeChartData}
                            period={period}
                        />
                    </section>
                </>
            )}
        </div>
    );
}
