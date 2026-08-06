import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, CheckCircle2, GraduationCap, Flame, Trophy, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { IUser } from "../../shared/interfaces/IUser";
import type { IStudentDashboard } from "../../shared/interfaces/IDashboard";
import type { IStudentPerformance } from "../../shared/interfaces/IProgress";
import type { LessonProgressStatus } from "../../shared/interfaces/IEnrollment";
import { API_getStudentDashboard } from "./api";
import { API_getStudentPerformance } from "../progress/api";
import { StatCard } from "./components/StatCard";
import { CourseProgressChart } from "../../shared/components/charts/CourseProgressChart";
import { ActivityBarChart } from "../../shared/components/charts/ActivityBarChart";
import { DistributionBarChart } from "../../shared/components/charts/DistributionBarChart";
import { ScoreComparisonChart } from "../../shared/components/charts/ScoreComparisonChart";
import { ChartEmptyState } from "../../shared/components/charts/ChartEmptyState";
import { formatRelativeTime } from "./components/formatRelativeTime";
import { useExpandableList } from "./components/useExpandableList";
import { ShowMoreToggle } from "./components/ShowMoreToggle";
import { useCourseNavReturn } from "./components/useCourseNavReturn";
import { DashboardStateGate } from "./components/DashboardStateGate";
import { DashboardPanel } from "./components/DashboardPanel";
import { EmptyStateCard } from "./components/EmptyStateCard";
import { KURSA_DASHBOARD_REFRESH_EVENT } from "../../shared/constants/appEvents";
import { RecommendedCoursesCarousel } from "../../shared/components/RecommendedCoursesCarousel";

const STATUS_BADGE_CLASS: Record<LessonProgressStatus, string> = {
    not_started: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200",
};

function getStatusLabel(
    t: (key: string) => string,
): Record<LessonProgressStatus, string> {
    return {
        not_started: t("dashboard.student.status.notStarted"),
        in_progress: t("dashboard.student.status.inProgress"),
        completed: t("dashboard.student.status.completed"),
    };
}

export const StudentDashboard = ({ user }: { user: IUser }) => {
    const { t, i18n } = useTranslation();
    const weekdayFormatter = useMemo(
        () => new Intl.DateTimeFormat(i18n.language, { weekday: "short" }),
        [i18n.language],
    );
    const statusLabel = getStatusLabel(t);
    const location = useLocation();
    const courseNavReturn = useCourseNavReturn();
    const [data, setData] = useState<IStudentDashboard | null>(null);
    const [performance, setPerformance] = useState<IStudentPerformance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const coursesWithTests = useMemo(
        () =>
            (performance?.courses ?? []).filter(
                (c) => c.tests_with_attempts > 0 && c.user_avg_score != null,
            ),
        [performance],
    );

    const comparisonCourses = useMemo(
        () =>
            coursesWithTests
                .filter((c) => c.cohort_avg_score != null)
                .slice(0, 6),
        [coursesWithTests],
    );

    const recentAttemptsExpand = useExpandableList(
        performance?.recent_attempts ?? [],
        4,
    );
    const completedCoursesExpand = useExpandableList(
        data?.completed_courses ?? [],
        4,
    );
    const recentCoursesExpand = useExpandableList(data?.recent_courses ?? [], 4);
    const recentLessonsExpand = useExpandableList(data?.recent_lessons ?? [], 4);

    useEffect(() => {
        let cancelled = false;
        const load = async (quiet?: boolean) => {
            try {
                if (!quiet) setLoading(true);
                setError(null);
                const [dashboardRes, performanceRes] = await Promise.all([
                    API_getStudentDashboard(),
                    API_getStudentPerformance(),
                ]);
                if (!cancelled) {
                    setData(dashboardRes);
                    setPerformance(performanceRes);
                }
            } catch (e) {
                console.error("Error loading student dashboard:", e);
                if (!cancelled) setError(t("dashboard.student.loadError"));
            } finally {
                if (!quiet && !cancelled) setLoading(false);
            }
        };
        void load();
        const onRefresh = () => {
            void load(true);
        };
        window.addEventListener(KURSA_DASHBOARD_REFRESH_EVENT, onRefresh);
        return () => {
            cancelled = true;
            window.removeEventListener(KURSA_DASHBOARD_REFRESH_EVENT, onRefresh);
        };
    }, [location.key, t]);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                    {t("dashboard.student.greeting", { name: user.name })}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    {t("dashboard.student.subtitle")}
                </p>
            </header>

            <DashboardStateGate loading={loading} error={error} data={data}>
                {(data) => (
                <>
                    {/* Stat cards */}
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            icon={<BookOpen className="size-5" />}
                            label={t("dashboard.student.stats.inProgress")}
                            value={String(data.in_progress_count)}
                            helper={
                                data.in_progress_count === 0
                                    ? t("dashboard.student.stats.inProgressHelper")
                                    : undefined
                            }
                        />
                        <StatCard
                            icon={<CheckCircle2 className="size-5" />}
                            label={t("dashboard.student.stats.completed")}
                            value={String(data.completed_count)}
                        />
                        <StatCard
                            icon={<GraduationCap className="size-5" />}
                            label={t("dashboard.student.stats.lessonsCompleted")}
                            value={String(data.total_lessons_completed)}
                            helper={t("dashboard.student.stats.lessonsCompletedHelper")}
                        />
                        <StatCard
                            icon={<Flame className="size-5" />}
                            label={t("dashboard.student.stats.streak")}
                            value={t("dashboard.student.stats.streakDays", {
                                count: data.streak_days,
                            })}
                            helper={t("dashboard.student.stats.streakHelper")}
                        />
                    </section>

                    {/* Rendimiento en evaluaciones */}
                    <section className="mt-8">
                        <div className="mb-3 flex items-center gap-2">
                            <BarChart3 className="size-5 text-uned-primary dark:text-uned-primary" />
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                {t("dashboard.student.performance.title")}
                            </h2>
                        </div>

                        {!performance || performance.total_attempts === 0 ? (
                            <EmptyStateCard
                                title={t("dashboard.student.performance.emptyTitle")}
                                description={t("dashboard.student.performance.emptyDescription")}
                            />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <StatCard
                                        icon={<BarChart3 className="size-5" />}
                                        label={t("dashboard.student.performance.avgScore")}
                                        value={
                                            performance.overall_avg_score != null
                                                ? `${Math.round(performance.overall_avg_score)}%`
                                                : "—"
                                        }
                                        helper={t("dashboard.student.performance.avgScoreHelper")}
                                    />
                                    <StatCard
                                        icon={<CheckCircle2 className="size-5" />}
                                        label={t("dashboard.student.performance.totalAttempts")}
                                        value={String(performance.total_attempts)}
                                        helper={t("dashboard.student.performance.totalAttemptsHelper")}
                                    />
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                            {t("dashboard.student.performance.byCourseTitle")}
                                        </h3>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                            {t("dashboard.student.performance.byCourseSubtitle")}
                                        </p>
                                        <div className="mt-4">
                                            {coursesWithTests.length === 0 ? (
                                                <ChartEmptyState />
                                            ) : (
                                                <DistributionBarChart
                                                    data={coursesWithTests.map((c) => ({
                                                        label:
                                                            c.course_title.length > 18
                                                                ? `${c.course_title.slice(0, 16)}…`
                                                                : c.course_title,
                                                        value: Math.round(c.user_avg_score ?? 0),
                                                        title: c.course_title,
                                                    }))}
                                                    height={200}
                                                    showValues
                                                    valueLabel="%"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                            {t("dashboard.student.performance.vsCohortTitle")}
                                        </h3>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                            {t("dashboard.student.performance.vsCohortSubtitle")}
                                        </p>
                                        <div className="mt-4">
                                            <ScoreComparisonChart
                                                data={comparisonCourses.map((c) => ({
                                                    label:
                                                        c.course_title.length > 14
                                                            ? `${c.course_title.slice(0, 12)}…`
                                                            : c.course_title,
                                                    userScore: c.user_avg_score ?? 0,
                                                    cohortScore: c.cohort_avg_score ?? 0,
                                                }))}
                                                height={220}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                        {t("dashboard.student.performance.recentAttempts")}
                                    </h3>
                                    {performance.recent_attempts.length === 0 ? (
                                        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                                            {t("dashboard.student.performance.noAttempts")}
                                        </p>
                                    ) : (
                                        <div className="mt-3 overflow-x-auto">
                                            <table className="w-full min-w-[480px] text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400">
                                                        <th className="pb-2 pr-3 font-medium">{t("dashboard.student.performance.table.course")}</th>
                                                        <th className="pb-2 pr-3 font-medium">{t("dashboard.student.performance.table.lesson")}</th>
                                                        <th className="pb-2 pr-3 font-medium">{t("dashboard.student.performance.table.score")}</th>
                                                        <th className="pb-2 pr-3 font-medium">{t("dashboard.student.performance.table.status")}</th>
                                                        <th className="pb-2 font-medium">{t("dashboard.student.performance.table.date")}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                                    {recentAttemptsExpand.visibleItems.map((a) => (
                                                        <tr key={a.id}>
                                                            <td className="py-2 pr-3">
                                                                <Link
                                                                    to={`/course/${a.course_id}`}
                                                                    state={courseNavReturn}
                                                                    className="font-medium text-gray-900 hover:underline dark:text-slate-100"
                                                                >
                                                                    {a.course_title}
                                                                </Link>
                                                            </td>
                                                            <td className="py-2 pr-3">
                                                                <Link
                                                                    to={`/course/${a.course_id}/lesson/${a.lesson_id}`}
                                                                    state={courseNavReturn}
                                                                    className="text-gray-700 hover:underline dark:text-slate-300"
                                                                >
                                                                    {a.lesson_title}
                                                                </Link>
                                                            </td>
                                                            <td className="py-2 pr-3 font-medium text-gray-900 dark:text-slate-100">
                                                                {Math.round(a.score)}%
                                                            </td>
                                                            <td className="py-2 pr-3">
                                                                <span
                                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                                                        a.passed
                                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200"
                                                                            : "bg-red-100 text-red-700 dark:bg-red-900/35 dark:text-red-200"
                                                                    }`}
                                                                >
                                                                    {a.passed
                                                                        ? t("dashboard.student.performance.passed")
                                                                        : t("dashboard.student.performance.failed")}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 text-xs text-gray-500 dark:text-slate-400">
                                                                {formatRelativeTime(a.attempted_at, i18n.language)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <ShowMoreToggle
                                                canExpand={recentAttemptsExpand.canExpand}
                                                isExpanded={recentAttemptsExpand.isExpanded}
                                                hiddenCount={recentAttemptsExpand.hiddenCount}
                                                onToggle={recentAttemptsExpand.toggle}
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                    {/* Cursos completados al 100 % */}
                    <section className="mt-8">
                        <div className="mb-3 flex items-center gap-2">
                            <Trophy className="size-5 text-amber-600 dark:text-amber-400" />
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                {t("dashboard.student.completedCourses.title")}
                            </h2>
                        </div>
                        {(data.completed_courses ?? []).length === 0 ? (
                            <EmptyStateCard
                                title={t("dashboard.student.completedCourses.emptyTitle")}
                                description={t("dashboard.student.completedCourses.emptyDescription")}
                            />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {completedCoursesExpand.visibleItems.map((c) => (
                                        <article
                                            key={c.course_id}
                                            className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <Link
                                                    to={`/course/${c.course_id}`}
                                                    state={courseNavReturn}
                                                    className="text-sm font-semibold text-gray-900 hover:underline dark:text-slate-100"
                                                >
                                                    {c.course_title}
                                                </Link>
                                                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                                    {t("dashboard.student.completedCourses.badge")}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                                                {c.completed_at
                                                    ? t("dashboard.student.completedCourses.finishedAgo", {
                                                          time: formatRelativeTime(c.completed_at, i18n.language),
                                                      })
                                                    : t("dashboard.student.completedCourses.finished")}
                                            </p>
                                            <div className="mt-3 flex justify-end">
                                                <Link
                                                    to={`/course/${c.course_id}`}
                                                    state={courseNavReturn}
                                                    className="text-xs font-semibold text-uned-primary hover:text-uned-primary-hover dark:text-uned-primary"
                                                >
                                                    {t("dashboard.student.completedCourses.viewCourse")}
                                                </Link>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                                <ShowMoreToggle
                                    canExpand={completedCoursesExpand.canExpand}
                                    isExpanded={completedCoursesExpand.isExpanded}
                                    hiddenCount={completedCoursesExpand.hiddenCount}
                                    onToggle={completedCoursesExpand.toggle}
                                />
                            </>
                        )}
                    </section>

                    {/* Continue learning */}
                    <section className="mt-8">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                {t("dashboard.student.continueLearning.title")}
                            </h2>
                            <Link
                                to="/courses"
                                className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100"
                            >
                                {t("dashboard.student.continueLearning.viewAll")}
                            </Link>
                        </div>

                        {data.recent_courses.length === 0 ? (
                            <EmptyStateCard
                                title={t("dashboard.student.continueLearning.emptyTitle")}
                                action={{
                                    label: t("dashboard.student.continueLearning.exploreCourses"),
                                    to: "/courses",
                                }}
                            />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {recentCoursesExpand.visibleItems.map((c) => {
                                        const continueHref = c.next_lesson_id
                                            ? `/course/${c.course_id}/lesson/${c.next_lesson_id}`
                                            : `/course/${c.course_id}`;
                                        return (
                                            <article
                                                key={c.course_id}
                                                className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800"
                                            >
                                                <Link
                                                    to={`/course/${c.course_id}`}
                                                    state={courseNavReturn}
                                                    className="text-sm font-semibold text-gray-900 hover:underline dark:text-slate-100"
                                                >
                                                    {c.course_title}
                                                </Link>
                                                <div className="mt-2">
                                                    <CourseProgressChart
                                                        value={c.progress_percent}
                                                        rightLabel={t(
                                                            "dashboard.student.continueLearning.lessonsCount",
                                                            {
                                                                completed: c.completed_lessons_count,
                                                                total: c.total_lessons,
                                                            },
                                                        )}
                                                    />
                                                </div>
                                                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                                                    <span>
                                                        {t(
                                                            "dashboard.student.continueLearning.lastActivity",
                                                            {
                                                                time: formatRelativeTime(
                                                                    c.last_activity_at,
                                                                    i18n.language,
                                                                ),
                                                            },
                                                        )}
                                                    </span>
                                                    <Link
                                                        to={continueHref}
                                                        state={courseNavReturn}
                                                        className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                                                    >
                                                        {t("dashboard.student.continueLearning.continue")}
                                                    </Link>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                                <ShowMoreToggle
                                    canExpand={recentCoursesExpand.canExpand}
                                    isExpanded={recentCoursesExpand.isExpanded}
                                    hiddenCount={recentCoursesExpand.hiddenCount}
                                    onToggle={recentCoursesExpand.toggle}
                                />
                            </>
                        )}
                    </section>

                    {/* Activity */}
                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <DashboardPanel title={t("dashboard.student.recentActivity.title")}>
                            {data.recent_lessons.length === 0 ? (
                                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                                    {t("dashboard.student.recentActivity.empty")}
                                </p>
                            ) : (
                                <>
                                    <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-700">
                                        {recentLessonsExpand.visibleItems.map((l) => (
                                            <li
                                                key={`${l.lesson_id}-${l.last_activity_at ?? ""}`}
                                                className="flex items-start justify-between gap-3 py-3"
                                            >
                                                <div className="min-w-0">
                                                    <Link
                                                        to={`/course/${l.course_id}/lesson/${l.lesson_id}`}
                                                        state={courseNavReturn}
                                                        className="block truncate text-sm font-medium text-gray-900 hover:underline dark:text-slate-100"
                                                    >
                                                        {l.lesson_title}
                                                    </Link>
                                                    <Link
                                                        to={`/course/${l.course_id}`}
                                                        state={courseNavReturn}
                                                        className="block truncate text-xs text-gray-500 hover:underline dark:text-slate-400"
                                                    >
                                                        {l.course_title}
                                                    </Link>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-1">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_BADGE_CLASS[l.status]}`}
                                                    >
                                                        {statusLabel[l.status]}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 dark:text-slate-500">
                                                        {formatRelativeTime(
                                                            l.last_activity_at,
                                                            i18n.language,
                                                        )}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    <ShowMoreToggle
                                        canExpand={recentLessonsExpand.canExpand}
                                        isExpanded={recentLessonsExpand.isExpanded}
                                        hiddenCount={recentLessonsExpand.hiddenCount}
                                        onToggle={recentLessonsExpand.toggle}
                                    />
                                </>
                            )}
                        </DashboardPanel>

                        <DashboardPanel
                            className="flex h-full flex-col"
                            title={t("dashboard.student.studyWeek.title")}
                            description={t("dashboard.student.studyWeek.subtitle")}
                        >
                            <div className="mt-4 min-h-[180px] flex-1">
                                <ActivityBarChart
                                    fill
                                    data={data.last_7_days.map((d) => ({
                                        // The chart cell shows the weekday initial,
                                        // tooltip the full ISO date.
                                        label: weekdayFormatter.format(
                                            new Date(d.date),
                                        ),
                                        value: d.lessons_completed,
                                        title: `${d.date}: ${t("charts.completed", { count: d.lessons_completed })}`,
                                    }))}
                                    showValues
                                />
                            </div>
                        </DashboardPanel>
                    </section>
                </>
                )}
            </DashboardStateGate>

            <RecommendedCoursesCarousel className="mt-10" />
        </div>
    );
};
