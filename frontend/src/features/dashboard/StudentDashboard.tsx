import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, CheckCircle2, GraduationCap, Flame, Trophy, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { IUser } from "../../shared/interfaces/IUser";
import type { IStudentDashboard } from "../../shared/interfaces/IDashboard";
import type { IStudentPerformance } from "../../shared/interfaces/IProgress";
import { API_getStudentDashboard } from "./api";
import { API_getStudentPerformance } from "../progress/api";
import { useAsyncData } from "../../shared/hooks/useAsyncData";
import { formatPercent } from "../../shared/utils/formatPercent";
import { formatOrDash } from "../../shared/utils/formatOrDash";
import { StatCard } from "../../shared/components/StatCard";
import { ActivityBarChart } from "../../shared/components/charts/ActivityBarChart";
import { DistributionBarChart } from "../../shared/components/charts/DistributionBarChart";
import { ScoreComparisonChart } from "../../shared/components/charts/ScoreComparisonChart";
import { ChartEmptyState } from "../../shared/components/charts/ChartEmptyState";
import { useExpandableList } from "./components/useExpandableList";
import { ShowMoreToggle } from "./components/ShowMoreToggle";
import { useCourseNavReturn } from "./components/useCourseNavReturn";
import { DashboardStateGate } from "./components/DashboardStateGate";
import { DashboardPanel } from "./components/DashboardPanel";
import { EmptyStateCard } from "./components/EmptyStateCard";
import { RecentAttemptsTable } from "./components/RecentAttemptsTable";
import { RecentLessonItem } from "./components/RecentLessonItem";
import { CompletedCourseCard } from "./components/CompletedCourseCard";
import { ContinueLearningCourseCard } from "./components/ContinueLearningCourseCard";
import { KURSA_DASHBOARD_REFRESH_EVENT } from "../../shared/constants/appEvents";
import { RecommendedCoursesCarousel } from "../../shared/components/RecommendedCoursesCarousel";
import { getLessonTypeLabels } from "../../shared/types/LessonTypes";
import {
    getLessonProgressStatusLabels,
    lessonProgressStatusBadgeClassName,
} from "../../shared/types/LessonProgressTypes";

export const StudentDashboard = ({ user }: { user: IUser }) => {
    const { t, i18n } = useTranslation();
    const lessonTypeLabels = getLessonTypeLabels(t);
    const weekdayFormatter = useMemo(
        () => new Intl.DateTimeFormat(i18n.language, { weekday: "short" }),
        [i18n.language],
    );
    const statusLabel = getLessonProgressStatusLabels(t);
    const location = useLocation();
    const courseNavReturn = useCourseNavReturn();
    const {
        data: dashboardResult,
        loading,
        error,
        refetch,
    } = useAsyncData<{
        data: IStudentDashboard;
        performance: IStudentPerformance;
    }>(
        () =>
            Promise.all([
                API_getStudentDashboard(),
                API_getStudentPerformance(),
            ]).then(([data, performance]) => ({ data, performance })),
        [location.key, t],
        { errorMessage: t("dashboard.student.loadError") },
    );
    const data = dashboardResult?.data ?? null;
    const performance = dashboardResult?.performance ?? null;

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
        const onRefresh = () => {
            void refetch({ silent: true });
        };
        window.addEventListener(KURSA_DASHBOARD_REFRESH_EVENT, onRefresh);
        return () => window.removeEventListener(KURSA_DASHBOARD_REFRESH_EVENT, onRefresh);
    }, [refetch]);

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
                                        value={formatOrDash(performance.overall_avg_score, formatPercent)}
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
                                        <RecentAttemptsTable
                                            expand={recentAttemptsExpand}
                                            courseNavReturn={courseNavReturn}
                                            lessonTypeLabels={lessonTypeLabels}
                                            locale={i18n.language}
                                        />
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
                                        <CompletedCourseCard
                                            key={c.course_id}
                                            course={c}
                                            courseNavReturn={courseNavReturn}
                                            locale={i18n.language}
                                        />
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
                                    {recentCoursesExpand.visibleItems.map((c) => (
                                        <ContinueLearningCourseCard
                                            key={c.course_id}
                                            course={c}
                                            courseNavReturn={courseNavReturn}
                                            locale={i18n.language}
                                        />
                                    ))}
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
                                            <RecentLessonItem
                                                key={`${l.lesson_id}-${l.last_activity_at ?? ""}`}
                                                lesson={l}
                                                courseNavReturn={courseNavReturn}
                                                statusLabel={statusLabel[l.status]}
                                                statusBadgeClassName={lessonProgressStatusBadgeClassName[l.status]}
                                                locale={i18n.language}
                                            />
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
                                        title: d.date,
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
