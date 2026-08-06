import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Activity,
    ArrowRight,
    BookOpen,
    GraduationCap,
    TrendingUp,
    UserCheck,
} from "lucide-react";
import { API_getPublicStats } from "../dashboard/api";
import { StatCard } from "../dashboard/components/StatCard";
import { ActivityBarChart } from "../../shared/components/charts/ActivityBarChart";
import { DistributionBarChart } from "../../shared/components/charts/DistributionBarChart";
import { useTranslation } from "react-i18next";
import { formatCategoryLabel } from "../../shared/components/charts/chartFormatters";
import type { IPublicStats } from "../../shared/interfaces/IDashboard";
import { useAuth } from "../../shared/povider/AuthContext";
import { useAuthModal } from "../../shared/context/AuthModalContext";
import {
    getLessonTypeLabels,
    getPublicStatsPeriodLabels,
    type PublicStatsPeriod,
} from "../../shared/types/LessonTypes";
import type { LessonType } from "../course_edit/lessonTypes";

const PERIOD_HELPER_KEY: Record<PublicStatsPeriod, string> = {
    day: "landing.period.day",
    week: "landing.period.week",
    month: "landing.period.month",
};

export function LandingPage() {
    const { t, i18n } = useTranslation();
    const lessonTypeLabels = getLessonTypeLabels(t);
    const publicStatsPeriodLabels = getPublicStatsPeriodLabels(t);
    const dayFormatter = useMemo(
        () => new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "short" }),
        [i18n.language],
    );
    const { user } = useAuth();
    const { openLogin, openRegister } = useAuthModal();
    const [period, setPeriod] = useState<PublicStatsPeriod>("week");
    const [data, setData] = useState<IPublicStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await API_getPublicStats(period);
                if (!cancelled) setData(res);
            } catch (e) {
                console.error("Error loading public stats:", e);
                if (!cancelled)
                    setError(t("landing.loadStatsError"));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [period, t]);

    const totalCategoryEnrollments = useMemo(() => {
        if (!data) return 0;
        return data.category_distribution.reduce(
            (sum, c) => sum + c.enrollments_count,
            0,
        );
    }, [data]);

    const categoryChartData = useMemo(() => {
        if (!data) return [];
        return data.category_distribution.map((c) => ({
            label: formatCategoryLabel(c.category, t),
            value: c.enrollments_count,
        }));
    }, [data, t]);

    const lessonTypeChartData = useMemo(() => {
        if (!data) return [];
        return data.lesson_completions_by_type.map((row) => ({
            label:
                lessonTypeLabels[row.lesson_type as LessonType] ??
                row.lesson_type,
            value: row.completed_count,
        }));
    }, [data, lessonTypeLabels]);

    const activityChartData = useMemo(() => {
        if (!data) return [];
        return data.activity_series.map((d) => ({
            label: "",
            value: d.lessons_completed,
            title: `${dayFormatter.format(new Date(d.date))}: ${t("charts.completed", { count: d.lessons_completed })}`,
        }));
    }, [data, dayFormatter, t]);

    return (
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-uned-primary/10 via-white to-slate-50 px-6 py-10 dark:border-slate-600 dark:from-uned-primary/20 dark:via-slate-900 dark:to-slate-800 sm:px-10">
                <div className="relative z-10 max-w-2xl">
                    <p className="text-sm font-medium uppercase tracking-wide text-uned-primary">
                        {t("landing.badge")}
                    </p>
                    <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100 sm:text-4xl">
                        {t("landing.title")}
                    </h1>
                    <p className="mt-3 text-base text-gray-600 dark:text-slate-300">
                        {t("landing.subtitle")}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            to="/courses"
                            className="inline-flex items-center gap-2 rounded-lg bg-uned-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-uned-primary/90"
                        >
                            {t("landing.exploreCourses")}
                            <ArrowRight className="size-4" />
                        </Link>
                        {!user && (
                            <>
                                <button
                                    type="button"
                                    onClick={openRegister}
                                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                >
                                    {t("nav.register")}
                                </button>
                                <button
                                    type="button"
                                    onClick={openLogin}
                                    className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100"
                                >
                                    {t("nav.login")}
                                </button>
                            </>
                        )}
                        {user && (
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                            >
                                <GraduationCap className="size-4" />
                                {t("landing.myDashboard")}
                            </Link>
                        )}
                    </div>
                </div>
            </section>

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
                <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {t("landing.loadingStats")}
                </div>
            ) : error || !data ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error ?? t("dashboard.noData")}
                </div>
            ) : (
                <>
                    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            icon={<BookOpen className="size-5" />}
                            label={t("landing.stats.coursesInCatalog")}
                            value={String(data.courses_count)}
                        />
                        <StatCard
                            icon={<TrendingUp className="size-5" />}
                            label={t("landing.stats.totalEnrollments")}
                            value={String(data.total_enrollments)}
                        />
                        <StatCard
                            icon={<UserCheck className="size-5" />}
                            label={t("landing.stats.activeEnrollments")}
                            value={String(data.active_enrollments_count)}
                            helper={t("landing.stats.activeEnrollmentsHelper")}
                        />
                        <StatCard
                            icon={<Activity className="size-5" />}
                            label={t("landing.stats.lessonsCompleted")}
                            value={String(data.lessons_completed_in_period)}
                            helper={t(PERIOD_HELPER_KEY[period]).toLowerCase()}
                        />
                    </section>

                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
                            <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-600">
                                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                    {t("landing.popularCoursesTitle")}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    {t("landing.popularCoursesSubtitle")}
                                </p>
                            </div>
                            {data.top_courses.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                                    {t("landing.noEnrollmentsYet")}
                                </div>
                            ) : (
                                <ol className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {data.top_courses.map((c, idx) => (
                                        <li
                                            key={c.course_id}
                                            className="flex items-center justify-between px-4 py-2 text-sm"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-slate-700 dark:text-slate-200">
                                                    {idx + 1}
                                                </span>
                                                <Link
                                                    to={`/course/${c.course_id}`}
                                                    className="truncate text-gray-900 hover:underline dark:text-slate-100"
                                                >
                                                    {c.course_title}
                                                </Link>
                                            </span>
                                            <span className="ml-2 shrink-0 text-gray-600 dark:text-slate-300">
                                                {c.enrollments_count}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>

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
                                <DistributionBarChart
                                    data={categoryChartData}
                                    height={200}
                                />
                            </div>
                            {data.category_distribution.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {data.category_distribution.slice(0, 5).map((c) => (
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
                    </section>

                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                                    hideXLabels={data.activity_series.length > 7}
                                    data={activityChartData}
                                />
                                {data.activity_series.length > 1 && (
                                    <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-slate-500">
                                        <span>
                                            {dayFormatter.format(
                                                new Date(data.activity_series[0].date),
                                            )}
                                        </span>
                                        <span>
                                            {dayFormatter.format(
                                                new Date(
                                                    data.activity_series[
                                                        data.activity_series.length - 1
                                                    ].date,
                                                ),
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

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
                                <DistributionBarChart
                                    data={lessonTypeChartData}
                                    height={200}
                                />
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
