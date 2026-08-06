import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    CheckCircle2,
    Circle,
    GraduationCap,
    PlayCircle,
    Star,
    TrendingUp,
    Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/povider/AuthContext";
import type {
    IInstructorCourseStudents,
    IInstructorStudentDetail,
} from "../../shared/interfaces/IInstructorCourseStudents";
import type { EnrollmentStatus, LessonProgressStatus } from "../../shared/interfaces/IEnrollment";
import { API_getCourseDetailById } from "../course_detail/api";
import type { ICourses } from "../../shared/interfaces/ICourses";
import { StatCard } from "../dashboard/components/StatCard";
import { CourseProgressChart } from "../../shared/components/charts/CourseProgressChart";
import { CohortComparisonChart } from "../../shared/components/charts/CohortComparisonChart";
import { DistributionBarChart } from "../../shared/components/charts/DistributionBarChart";
import { formatCohortMonth } from "../../shared/components/charts/chartFormatters";
import { LessonCompletionChart } from "../../shared/components/charts/LessonCompletionChart";
import { formatRelativeTime } from "../dashboard/components/formatRelativeTime";
import { API_getCourseStudents, API_getStudentDetail } from "./api";
import { SubmissionsPanel } from "./components/SubmissionsPanel";

const ENROLLMENT_STATUS_CLASS: Record<EnrollmentStatus, string> = {
    in_progress:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    completed:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    dropped: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
};

function getEnrollmentStatusLabel(
    t: (key: string) => string,
): Record<EnrollmentStatus, string> {
    return {
        in_progress: t("courseStudents.enrollmentStatus.in_progress"),
        completed: t("courseStudents.enrollmentStatus.completed"),
        dropped: t("courseStudents.enrollmentStatus.dropped"),
    };
}

function getLessonStatusLabel(
    t: (key: string) => string,
): Record<LessonProgressStatus, string> {
    return {
        not_started: t("courseStudents.lessonStatus.not_started"),
        in_progress: t("courseStudents.lessonStatus.in_progress"),
        completed: t("courseStudents.lessonStatus.completed"),
    };
}

function LessonStatusIcon({ status }: { status: LessonProgressStatus }) {
    if (status === "completed")
        return <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />;
    if (status === "in_progress")
        return <PlayCircle className="size-4 text-amber-600 dark:text-amber-400" />;
    return <Circle className="size-4 text-gray-400 dark:text-slate-500" />;
}

function StudentLessonDetail({ detail }: { detail: IInstructorStudentDetail }) {
    const { t, i18n } = useTranslation();
    const lessonStatusLabel = getLessonStatusLabel(t);

    return (
        <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {detail.lesson_progress.map((lp) => (
                <li
                    key={lp.lesson_id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <LessonStatusIcon status={lp.status} />
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                            {lp.lesson_title}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                            #{lp.position}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                        <span>{lessonStatusLabel[lp.status]}</span>
                        {(lp.lesson_type === "test" ||
                            lp.lesson_type === "multiple_selection") &&
                        lp.attempts > 0 ? (
                            <span>
                                {t("courseStudents.score")}:{" "}
                                {lp.best_score != null
                                    ? `${Math.round(lp.best_score)}%`
                                    : "—"}{" "}
                                · {t("courseStudents.attemptCount", { count: lp.attempts })}
                            </span>
                        ) : null}
                        {lp.completed_at ? (
                            <span>
                                {t("courseStudents.completedAgo", {
                                    time: formatRelativeTime(lp.completed_at, i18n.language),
                                })}
                            </span>
                        ) : null}
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function CourseStudents() {
    const { courseId: courseIdParam } = useParams();
    const courseId = Number(courseIdParam);
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const enrollmentStatusLabel = getEnrollmentStatusLabel(t);

    const [course, setCourse] = useState<ICourses | null>(null);
    const [data, setData] = useState<IInstructorCourseStudents | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
    const [detailByUser, setDetailByUser] = useState<
        Record<number, IInstructorStudentDetail>
    >({});
    const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);

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

    const lessonChartData = useMemo(() => {
        if (!data) return [];
        return data.lesson_stats.map((lesson) => ({
            label: `#${lesson.position}`,
            value: lesson.completed_count,
            title: lesson.lesson_title,
            completionRate: lesson.completion_rate,
        }));
    }, [data]);

    const progressBucketData = useMemo(() => {
        if (!data) return [];
        return data.progress_buckets.map((bucket) => ({
            label: bucket.label,
            value: bucket.count,
        }));
    }, [data]);

    const cohortChartData = useMemo(() => {
        if (!data) return [];
        return data.cohorts.map((cohort) => ({
            label: formatCohortMonth(cohort.cohort_month),
            enrollments_count: cohort.enrollments_count,
            avg_progress_percent: cohort.avg_progress_percent,
            completion_rate: cohort.completion_rate,
        }));
    }, [data]);

    useEffect(() => {
        if (!Number.isFinite(courseId)) {
            setError(t("courseStudents.invalidCourse"));
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const [courseDetail, studentsData] = await Promise.all([
                    API_getCourseDetailById(courseId),
                    API_getCourseStudents(courseId),
                ]);
                if (!cancelled) {
                    setCourse(courseDetail);
                    setData(studentsData);
                }
            } catch (e) {
                console.error("Error loading course students:", e);
                if (!cancelled) {
                    setError(t("courseStudents.loadError"));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [courseId, t]);

    const toggleStudent = useCallback(
        async (userId: number) => {
            if (expandedUserId === userId) {
                setExpandedUserId(null);
                return;
            }
            setExpandedUserId(userId);
            if (detailByUser[userId]) return;

            try {
                setLoadingDetailId(userId);
                const detail = await API_getStudentDetail(courseId, userId);
                setDetailByUser((prev) => ({ ...prev, [userId]: detail }));
            } catch (e) {
                console.error(e);
                toast.error(t("courseStudents.loadDetailError"));
                setExpandedUserId(null);
            } finally {
                setLoadingDetailId(null);
            }
        },
        [courseId, detailByUser, expandedUserId, t],
    );

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
                    value={`${Math.round(data.avg_progress_percent)}%`}
                />
                <StatCard
                    icon={<TrendingUp className="size-5" />}
                    label={t("courseStudents.stats.completionRate")}
                    value={`${Math.round(data.completion_rate * 100)}%`}
                />
                <StatCard
                    icon={<Star className="size-5" />}
                    label={t("courseStudents.stats.avgRating")}
                    value={
                        data.avg_rating != null ? data.avg_rating.toFixed(1) : "—"
                    }
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

            <section className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
                {data.students.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
                        {t("courseStudents.noStudents")}
                    </p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    {t("courseStudents.table.student")}
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    {t("courseStudents.table.status")}
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    {t("courseStudents.table.progress")}
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    {t("courseStudents.table.lessons")}
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    {t("courseStudents.table.lastActivity")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {data.students.map((student) => {
                                const isExpanded = expandedUserId === student.user_id;
                                const detail = detailByUser[student.user_id];
                                return (
                                    <Fragment key={student.user_id}>
                                        <tr
                                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40"
                                            onClick={() => void toggleStudent(student.user_id)}
                                        >
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                                                {student.student_name}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ENROLLMENT_STATUS_CLASS[student.status]}`}
                                                >
                                                    {enrollmentStatusLabel[student.status]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="w-36">
                                                    <CourseProgressChart
                                                        value={student.progress_percent}
                                                        rightLabel={`${Math.round(student.progress_percent)}%`}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                                                {student.completed_lessons_count}/
                                                {student.total_lessons}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                                                {formatRelativeTime(student.last_activity_at, i18n.language)}
                                            </td>
                                        </tr>
                                        {isExpanded ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="bg-gray-50 px-4 py-4 dark:bg-slate-900/50"
                                                >
                                                    {loadingDetailId === student.user_id ? (
                                                        <p className="text-sm text-gray-500 dark:text-slate-400">
                                                            {t("courseStudents.loadingLessons")}
                                                        </p>
                                                    ) : detail ? (
                                                        <StudentLessonDetail detail={detail} />
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </section>

            <div id="submissions">
                <SubmissionsPanel courseId={courseId} />
            </div>
        </div>
    );
}
