import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
    CheckCircle2,
    GraduationCap,
    Star,
    TrendingUp,
    Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/provider/AuthContext";
import type { IInstructorCourseStudents } from "../../shared/interfaces/IInstructorCourseStudents";
import { API_getCourseDetailById } from "../course_detail/api";
import type { ICourses } from "../../shared/interfaces/ICourses";
import { useAsyncData } from "../../shared/hooks/useAsyncData";
import { formatPercent } from "../../shared/utils/formatPercent";
import { formatOrDash } from "../../shared/utils/formatOrDash";
import { StatCard } from "../../shared/components/StatCard";
import { CohortComparisonChart } from "../../shared/components/charts/CohortComparisonChart";
import { DistributionBarChart } from "../../shared/components/charts/DistributionBarChart";
import { LessonCompletionChart } from "../../shared/components/charts/LessonCompletionChart";
import { API_getCourseStudents } from "./api";
import { StudentsTable } from "./components/StudentsTable";
import { SubmissionsPanel } from "./components/SubmissionsPanel";
import { useCourseStudentsCharts } from "./useCourseStudentsCharts";

export function CourseStudents() {
    const { courseId: courseIdParam } = useParams();
    const courseId = Number(courseIdParam);
    const { user } = useAuth();
    const { t } = useTranslation();

    const { data: result, loading, error } = useAsyncData<{
        course: ICourses;
        data: IInstructorCourseStudents;
    }>(
        () => {
            if (!Number.isFinite(courseId)) {
                return Promise.reject(t("courseStudents.invalidCourse"));
            }
            return Promise.all([
                API_getCourseDetailById(courseId),
                API_getCourseStudents(courseId),
            ]).then(([course, data]) => ({ course, data }));
        },
        [courseId, t],
        { errorMessage: t("courseStudents.loadError") },
    );
    const course = result?.course ?? null;
    const data = result?.data ?? null;

    const canManage = useMemo(() => {
        if (!user || !course) return false;
        if (user.role === "admin") return true;
        if (
            user.role === "instructor" &&
            course.instructor_id !== null &&
            user.id === course.instructor_id
        ) {
            return true;
        }
        return false;
    }, [user, course]);

    const { lessonChartData, progressBucketData, cohortChartData } =
        useCourseStudentsCharts(data);

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {t("courseStudents.loading")}
                </div>
            </div>
        );
    }

    if (error || !data || !course) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    {error ?? t("courseStudents.noData")}
                </div>
            </div>
        );
    }

    if (!canManage) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    {t("courseStudents.noPermission")}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <Link
                        to={`/course/${courseId}`}
                        className="text-sm font-medium text-uned-primary hover:text-uned-primary-hover dark:text-uned-primary"
                    >
                        {t("courseStudents.backToCourse")}
                    </Link>
                    <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
                        {t("courseStudents.title", { courseTitle: data.course_title })}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        {t("courseStudents.subtitle")}
                    </p>
                </div>
                <Link
                    to={`/course/${courseId}/edit`}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                    {t("courseStudents.editCourse")}
                </Link>
            </div>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    icon={<Users className="size-5" />}
                    label={t("courseStudents.stats.enrolled")}
                    value={String(data.students_count)}
                />
                <StatCard
                    icon={<GraduationCap className="size-5" />}
                    label={t("courseStudents.stats.completed")}
                    value={String(data.completed_count)}
                />
                <StatCard
                    icon={<CheckCircle2 className="size-5" />}
                    label={t("courseStudents.stats.avgProgress")}
                    value={formatPercent(data.avg_progress_percent)}
                />
                <StatCard
                    icon={<TrendingUp className="size-5" />}
                    label={t("courseStudents.stats.completionRate")}
                    value={formatPercent(data.completion_rate * 100)}
                />
                <StatCard
                    icon={<Star className="size-5" />}
                    label={t("courseStudents.stats.avgRating")}
                    value={formatOrDash(data.avg_rating, (v) => v.toFixed(1))}
                />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        {t("courseStudents.charts.lessonCompletion.title")}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        {t("courseStudents.charts.lessonCompletion.subtitle")}
                    </p>
                    <div className="mt-4">
                        <LessonCompletionChart data={lessonChartData} />
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        {t("courseStudents.charts.progressDistribution.title")}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        {t("courseStudents.charts.progressDistribution.subtitle")}
                    </p>
                    <div className="mt-4">
                        <DistributionBarChart
                            data={progressBucketData}
                            height={180}
                            valueLabel={t("courseStudents.charts.studentsUnit")}
                        />
                    </div>
                </div>
            </section>

            <section className="mt-8">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        {t("courseStudents.charts.cohorts.title")}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        {t("courseStudents.charts.cohorts.subtitle")}
                    </p>
                    <div className="mt-4">
                        <CohortComparisonChart data={cohortChartData} height={220} />
                    </div>
                </div>
            </section>

            <StudentsTable courseId={courseId} students={data.students} />

            <div id="submissions">
                <SubmissionsPanel courseId={courseId} />
            </div>
        </div>
    );
}
