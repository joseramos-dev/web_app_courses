import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BookOpen, Star, TrendingUp, UserCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { IUser } from "../../shared/interfaces/IUser";
import type { IAdminDashboard } from "../../shared/interfaces/IDashboard";
import { getDifficultyLabels } from "../../shared/types/CourseTypes";
import { API_getAdminDashboard } from "./api";
import { StatCard } from "./components/StatCard";
import { useExpandableList } from "./components/useExpandableList";
import { ShowMoreToggle } from "./components/ShowMoreToggle";
import { useCourseNavReturn } from "./components/useCourseNavReturn";
import { DashboardStateGate } from "./components/DashboardStateGate";
import { DashboardPanel } from "./components/DashboardPanel";
import { RankedList } from "./components/RankedList";
import { ActivityBarChart } from "../../shared/components/charts/ActivityBarChart";
import { CohortComparisonChart } from "../../shared/components/charts/CohortComparisonChart";
import { DistributionBarChart } from "../../shared/components/charts/DistributionBarChart";
import { DistributionPieChart } from "../../shared/components/charts/DistributionPieChart";
import {
    formatCategoryLabel,
    formatCohortMonth,
} from "../../shared/components/charts/chartFormatters";

export const AdminDashboard = ({ user }: { user: IUser }) => {
    const { t, i18n } = useTranslation();
    const dayFormatter = useMemo(
        () => new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "short" }),
        [i18n.language],
    );
    const difficultyLabels = getDifficultyLabels(t);
    const courseNavReturn = useCourseNavReturn();
    const [data, setData] = useState<IAdminDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const topCoursesExpand = useExpandableList(data?.top_courses ?? [], 3);
    const topActiveStudentsExpand = useExpandableList(
        data?.top_active_students ?? [],
        3,
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await API_getAdminDashboard();
                if (!cancelled) setData(res);
            } catch (e) {
                console.error("Error loading admin dashboard:", e);
                if (!cancelled)
                    setError(t("dashboard.admin.loadError"));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [t]);

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

    const siteChartData = useMemo(() => {
        if (!data) return [];
        return data.site_distribution.map((s) => ({
            label: s.site,
            value: s.enrollments_count,
        }));
    }, [data]);

    const difficultyChartData = useMemo(() => {
        if (!data) return [];
        return data.difficulty_distribution.map((d) => ({
            label: difficultyLabels[d.difficulty],
            value: d.enrollments_count,
        }));
    }, [data]);

    const cohortChartData = useMemo(() => {
        if (!data) return [];
        return data.enrollment_cohorts.map((c) => ({
            label: formatCohortMonth(c.cohort_month, i18n.language),
            enrollments_count: c.enrollments_count,
            avg_progress_percent: c.avg_progress_percent,
            completion_rate: c.completion_rate,
        }));
    }, [data, i18n.language]);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                        {t("dashboard.admin.title")}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        {t("dashboard.admin.greeting", { name: user.name })}
                    </p>
                </div>
                <Link
                    to="/admin"
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    {t("dashboard.admin.advancedManagement")}
                </Link>
            </header>

            <DashboardStateGate loading={loading} error={error} data={data}>
                {(data) => (
                <>
                    {/* Stat cards globales */}
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <StatCard
                            icon={<Users className="size-5" />}
                            label={t("dashboard.admin.stats.students")}
                            value={String(data.students_count)}
                            helper={t("dashboard.admin.stats.studentsHelper")}
                        />
                        <StatCard
                            icon={<BookOpen className="size-5" />}
                            label={t("dashboard.admin.stats.coursesPublished")}
                            value={String(data.courses_count)}
                        />
                        <StatCard
                            icon={<UserCheck className="size-5" />}
                            label={t("dashboard.admin.stats.activeEnrollments")}
                            value={String(data.active_enrollments_count)}
                            helper={t("dashboard.admin.stats.activeEnrollmentsHelper")}
                        />
                        <StatCard
                            icon={<Activity className="size-5" />}
                            label={t("dashboard.admin.stats.lessonsCompleted")}
                            value={String(data.total_lessons_completed)}
                            helper={t("dashboard.admin.stats.lessonsCompletedHelper")}
                        />
                        <StatCard
                            icon={<TrendingUp className="size-5" />}
                            label={t("dashboard.admin.stats.completionRate")}
                            value={`${Math.round(data.completion_rate * 100)}%`}
                            helper={t("dashboard.admin.stats.completionRateHelper", {
                                count: data.total_enrollments,
                            })}
                        />
                        <StatCard
                            icon={<Star className="size-5" />}
                            label={t("dashboard.admin.stats.avgRating")}
                            value={
                                data.avg_course_rating != null
                                    ? data.avg_course_rating.toFixed(1)
                                    : "—"
                            }
                            helper={t("dashboard.admin.stats.avgRatingHelper")}
                        />
                    </section>

                    {/* Top cursos + top estudiantes */}
                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <DashboardPanel
                            variant="divided"
                            title={t("dashboard.admin.topCourses.title")}
                            description={t("dashboard.admin.topCourses.subtitle")}
                        >
                            {data.top_courses.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                                    {t("dashboard.admin.topCourses.empty")}
                                </div>
                            ) : (
                                <>
                                    <RankedList
                                        items={topCoursesExpand.visibleItems}
                                        keyFor={(c) => c.course_id}
                                        renderLeft={(c) => (
                                            <Link
                                                to={`/course/${c.course_id}`}
                                                state={courseNavReturn}
                                                className="text-gray-900 hover:underline dark:text-slate-100"
                                            >
                                                {c.course_title}
                                            </Link>
                                        )}
                                        renderRight={(c) =>
                                            t("dashboard.admin.topCourses.enrollments", {
                                                count: c.enrollments_count,
                                            })
                                        }
                                    />
                                    <div className="px-4 pb-3">
                                        <ShowMoreToggle
                                            canExpand={topCoursesExpand.canExpand}
                                            isExpanded={topCoursesExpand.isExpanded}
                                            hiddenCount={topCoursesExpand.hiddenCount}
                                            onToggle={topCoursesExpand.toggle}
                                        />
                                    </div>
                                </>
                            )}
                        </DashboardPanel>

                        <DashboardPanel
                            variant="divided"
                            title={t("dashboard.admin.topStudents.title")}
                            description={t("dashboard.admin.topStudents.subtitle")}
                        >
                            {data.top_active_students.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                                    {t("dashboard.admin.topStudents.empty")}
                                </div>
                            ) : (
                                <>
                                    <RankedList
                                        items={topActiveStudentsExpand.visibleItems}
                                        keyFor={(s) => s.user_id}
                                        renderLeft={(s) => (
                                            <span className="text-gray-900 dark:text-slate-100">
                                                {s.name}
                                            </span>
                                        )}
                                        renderRight={(s) =>
                                            t("dashboard.admin.topStudents.lessons", {
                                                count: s.lessons_completed_in_window,
                                            })
                                        }
                                    />
                                    <div className="px-4 pb-3">
                                        <ShowMoreToggle
                                            canExpand={topActiveStudentsExpand.canExpand}
                                            isExpanded={topActiveStudentsExpand.isExpanded}
                                            hiddenCount={topActiveStudentsExpand.hiddenCount}
                                            onToggle={topActiveStudentsExpand.toggle}
                                        />
                                    </div>
                                </>
                            )}
                        </DashboardPanel>
                    </section>

                    {/* Distribución por categoría + actividad global */}
                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <DashboardPanel
                            title={t("dashboard.admin.categoryDistribution.title")}
                            description={
                                totalCategoryEnrollments > 0
                                    ? t(
                                          "dashboard.admin.categoryDistribution.descriptionWithTotal",
                                          { total: totalCategoryEnrollments },
                                      )
                                    : t(
                                          "dashboard.admin.categoryDistribution.descriptionNoTotal",
                                      )
                            }
                        >
                            <div className="mt-4">
                                <DistributionBarChart data={categoryChartData} height={180} />
                            </div>
                        </DashboardPanel>

                        <DashboardPanel
                            title={t("dashboard.admin.activity.title")}
                            description={t("dashboard.admin.activity.description")}
                        >
                            <div className="mt-4">
                                <ActivityBarChart
                                    height={140}
                                    hideXLabels
                                    data={data.last_30_days.map((d) => ({
                                        label: "",
                                        value: d.lessons_completed,
                                        title: `${dayFormatter.format(new Date(d.date))}: ${t("charts.completed", { count: d.lessons_completed })}`,
                                    }))}
                                />
                                <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-slate-500">
                                    <span>
                                        {data.last_30_days[0]
                                            ? dayFormatter.format(
                                                  new Date(data.last_30_days[0].date),
                                              )
                                            : ""}
                                    </span>
                                    <span>
                                        {data.last_30_days[data.last_30_days.length - 1]
                                            ? dayFormatter.format(
                                                  new Date(
                                                      data.last_30_days[
                                                          data.last_30_days.length - 1
                                                      ].date,
                                                  ),
                                              )
                                            : ""}
                                    </span>
                                </div>
                            </div>
                        </DashboardPanel>
                    </section>

                    {/* Plataforma + dificultad */}
                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <DashboardPanel
                            title={t("dashboard.admin.platformDistribution.title")}
                            description={t("dashboard.admin.platformDistribution.description")}
                        >
                            <div className="mt-2">
                                <DistributionPieChart data={siteChartData} />
                            </div>
                        </DashboardPanel>

                        <DashboardPanel
                            title={t("dashboard.admin.difficultyDistribution.title")}
                            description={t("dashboard.admin.difficultyDistribution.description")}
                        >
                            <div className="mt-4">
                                <DistributionBarChart
                                    data={difficultyChartData}
                                    height={180}
                                />
                            </div>
                        </DashboardPanel>
                    </section>

                    {/* Cohortes */}
                    <section className="mt-8">
                        <DashboardPanel
                            title={t("dashboard.admin.cohorts.title")}
                            description={t("dashboard.admin.cohorts.description")}
                        >
                            <div className="mt-4">
                                <CohortComparisonChart data={cohortChartData} height={220} />
                            </div>
                        </DashboardPanel>
                    </section>
                </>
                )}
            </DashboardStateGate>
        </div>
    );
};
