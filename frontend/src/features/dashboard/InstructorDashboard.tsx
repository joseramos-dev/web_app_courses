import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    BookOpen,
    ClipboardList,
    GraduationCap,
    Plus,
    TrendingUp,
    Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { IUser } from "../../shared/interfaces/IUser";
import type { IInstructorDashboard } from "../../shared/interfaces/IDashboard";
import { API_getInstructorDashboard } from "./api";
import { StatCard } from "./components/StatCard";
import { CourseProgressChart } from "../../shared/components/charts/CourseProgressChart";
import { formatRelativeTime } from "./components/formatRelativeTime";
import { useExpandableList } from "./components/useExpandableList";
import { ShowMoreToggle } from "./components/ShowMoreToggle";
import { useCourseNavReturn } from "./components/useCourseNavReturn";
import { DashboardStateGate } from "./components/DashboardStateGate";
import { DashboardPanel } from "./components/DashboardPanel";
import { RankedList } from "./components/RankedList";

export const InstructorDashboard = ({ user }: { user: IUser }) => {
    const { t, i18n } = useTranslation();
    const courseNavReturn = useCourseNavReturn();
    const [data, setData] = useState<IInstructorDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const coursesExpand = useExpandableList(data?.courses ?? [], 5);
    const activeStudentsExpand = useExpandableList(
        data?.top_active_students ?? [],
        3,
    );
    const completedLessonsExpand = useExpandableList(
        data?.top_completed_lessons ?? [],
        3,
    );
    const pendingSubmissionsExpand = useExpandableList(
        data?.pending_submissions ?? [],
        4,
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await API_getInstructorDashboard();
                if (!cancelled) setData(res);
            } catch (e) {
                console.error("Error loading instructor dashboard:", e);
                if (!cancelled)
                    setError(t("dashboard.instructor.loadError"));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [t]);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">
                    {t("dashboard.instructor.title")}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    {t("dashboard.instructor.greeting", { name: user.name })}
                </p>
            </header>

            <DashboardStateGate loading={loading} error={error} data={data}>
                {(data) => (
                <>
                    {/* Stat cards */}
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            icon={<BookOpen className="size-5" />}
                            label={t("dashboard.instructor.stats.myCourses")}
                            value={String(data.courses_count)}
                            helper={t("dashboard.instructor.stats.myCoursesHelper")}
                        />
                        <StatCard
                            icon={<Users className="size-5" />}
                            label={t("dashboard.instructor.stats.enrolledStudents")}
                            value={String(data.total_students)}
                            helper={t("dashboard.instructor.stats.enrolledStudentsHelper")}
                        />
                        <StatCard
                            icon={<TrendingUp className="size-5" />}
                            label={t("dashboard.instructor.stats.avgProgress")}
                            value={`${Math.round(data.avg_progress_percent)}%`}
                            helper={t("dashboard.instructor.stats.avgProgressHelper")}
                        />
                        <StatCard
                            icon={<GraduationCap className="size-5" />}
                            label={t("dashboard.instructor.stats.completedStudents")}
                            value={String(data.completed_students)}
                        />
                    </section>

                    {/* Cursos del instructor */}
                    <section className="mt-8">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-base font-semibold text-gray-900">
                                {t("dashboard.instructor.myCourses")}
                            </h2>
                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    to="/course/new"
                                    className="inline-flex items-center gap-2 rounded-lg bg-uned-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md ring-2 ring-uned-primary/30 transition hover:bg-uned-primary-hover hover:shadow-lg dark:text-slate-900 dark:ring-uned-primary/40"
                                >
                                    <Plus className="size-4" aria-hidden />
                                    {t("dashboard.instructor.createCourse")}
                                </Link>
                                <Link
                                    to="/courses"
                                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                >
                                    {t("dashboard.instructor.goToCatalog")}
                                </Link>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                                <thead className="bg-gray-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            {t("dashboard.instructor.table.course")}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            {t("dashboard.instructor.table.students")}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            {t("dashboard.instructor.table.avgProgress")}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            {t("dashboard.instructor.table.completed")}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            {t("dashboard.instructor.table.completionRate")}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            {t("dashboard.instructor.table.rating")}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            {t("dashboard.instructor.table.lastActivity")}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {data.courses.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400"
                                            >
                                                {t("dashboard.instructor.noCourses")}
                                            </td>
                                        </tr>
                                    ) : (
                                        coursesExpand.visibleItems.map((row) => (
                                            <tr key={row.course_id}>
                                                <td className="px-4 py-3 text-sm">
                                                    <Link
                                                        to={`/course/${row.course_id}`}
                                                        state={courseNavReturn}
                                                        className="font-medium text-gray-900 hover:underline dark:text-slate-100"
                                                    >
                                                        {row.course_title}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                                                    {row.students_count}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                                                    <div className="w-32">
                                                        <CourseProgressChart
                                                            value={row.avg_progress_percent}
                                                            rightLabel={`${Math.round(row.avg_progress_percent)}%`}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                                                    {row.completed_students}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                                                    {Math.round(row.completion_rate * 100)}%
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                                                    {row.avg_rating != null
                                                        ? row.avg_rating.toFixed(1)
                                                        : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                                                    {formatRelativeTime(row.last_activity_at, i18n.language)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <ShowMoreToggle
                            canExpand={coursesExpand.canExpand}
                            isExpanded={coursesExpand.isExpanded}
                            hiddenCount={coursesExpand.hiddenCount}
                            onToggle={coursesExpand.toggle}
                        />
                    </section>

                    {/* Alumnos recientes + lecciones más completadas */}
                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <DashboardPanel
                            title={t("dashboard.instructor.activeStudents.title")}
                            description={t("dashboard.instructor.activeStudents.subtitle")}
                        >
                            {data.top_active_students.length === 0 ? (
                                <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                                    {t("dashboard.instructor.activeStudents.empty")}
                                </p>
                            ) : (
                                <>
                                    <RankedList
                                        items={activeStudentsExpand.visibleItems}
                                        keyFor={(s) => s.user_id}
                                        className="mt-3 divide-y divide-gray-100 dark:divide-slate-700"
                                        itemClassName="flex items-center justify-between py-2 text-sm"
                                        renderLeft={(s) => (
                                            <span className="text-gray-900 dark:text-slate-100">
                                                {s.name}
                                            </span>
                                        )}
                                        renderRight={(s) =>
                                            t("dashboard.instructor.activeStudents.lessons", {
                                                count: s.lessons_completed_in_window,
                                            })
                                        }
                                    />
                                    <ShowMoreToggle
                                        canExpand={activeStudentsExpand.canExpand}
                                        isExpanded={activeStudentsExpand.isExpanded}
                                        hiddenCount={activeStudentsExpand.hiddenCount}
                                        onToggle={activeStudentsExpand.toggle}
                                    />
                                </>
                            )}
                        </DashboardPanel>

                        <DashboardPanel
                            title={t("dashboard.instructor.completedLessons.title")}
                            description={t("dashboard.instructor.completedLessons.subtitle")}
                        >
                            {data.top_completed_lessons.length === 0 ? (
                                <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                                    {t("dashboard.instructor.completedLessons.empty")}
                                </p>
                            ) : (
                                <>
                                    <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-700">
                                        {completedLessonsExpand.visibleItems.map((l) => (
                                            <li
                                                key={l.lesson_id}
                                                className="flex items-start justify-between gap-3 py-2"
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
                                                <span className="shrink-0 text-sm font-semibold text-gray-700 dark:text-slate-200">
                                                    {l.completed_count}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    <ShowMoreToggle
                                        canExpand={completedLessonsExpand.canExpand}
                                        isExpanded={completedLessonsExpand.isExpanded}
                                        hiddenCount={completedLessonsExpand.hiddenCount}
                                        onToggle={completedLessonsExpand.toggle}
                                    />
                                </>
                            )}
                        </DashboardPanel>
                    </section>

                    {/* Entregas pendientes de corregir */}
                    <section className="mt-8">
                        <DashboardPanel
                            icon={<ClipboardList className="size-5 text-gray-500 dark:text-slate-400" />}
                            title={t("dashboard.instructor.pendingSubmissions.title")}
                            description={
                                data.pending_submissions_count === 0
                                    ? t("dashboard.instructor.pendingSubmissions.none")
                                    : t("dashboard.instructor.pendingSubmissions.countTotal", {
                                          count: data.pending_submissions_count,
                                      })
                            }
                        >
                            {data.pending_submissions.length > 0 && (
                                <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-700">
                                    {pendingSubmissionsExpand.visibleItems.map((s) => (
                                        <li
                                            key={s.id}
                                            className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                                        >
                                            <div className="min-w-0">
                                                <div className="font-medium text-gray-900 dark:text-slate-100">
                                                    {s.student_name}
                                                </div>
                                                <div className="truncate text-xs text-gray-500 dark:text-slate-400">
                                                    {s.lesson_title} · {s.course_title}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-3">
                                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                                    {formatRelativeTime(s.submitted_at, i18n.language)}
                                                </span>
                                                <Link
                                                    to={`/course/${s.course_id}/students#submissions`}
                                                    state={courseNavReturn}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                                >
                                                    {t("dashboard.instructor.pendingSubmissions.review")}
                                                </Link>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <ShowMoreToggle
                                canExpand={pendingSubmissionsExpand.canExpand}
                                isExpanded={pendingSubmissionsExpand.isExpanded}
                                hiddenCount={pendingSubmissionsExpand.hiddenCount}
                                onToggle={pendingSubmissionsExpand.toggle}
                            />

                            {data.pending_submissions_count >
                                data.pending_submissions.length && (
                                <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                                    {t("dashboard.instructor.pendingSubmissions.moreTotal", {
                                        count: data.pending_submissions_count,
                                    })}
                                </p>
                            )}
                        </DashboardPanel>
                    </section>
                </>
                )}
            </DashboardStateGate>
        </div>
    );
};
