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

const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
    in_progress: "En progreso",
    completed: "Completado",
    dropped: "Abandonado",
};

const ENROLLMENT_STATUS_CLASS: Record<EnrollmentStatus, string> = {
    in_progress:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    completed:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    dropped: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
};

const LESSON_STATUS_LABEL: Record<LessonProgressStatus, string> = {
    not_started: "Sin empezar",
    in_progress: "En curso",
    completed: "Completada",
};

function LessonStatusIcon({ status }: { status: LessonProgressStatus }) {
    if (status === "completed")
        return <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />;
    if (status === "in_progress")
        return <PlayCircle className="size-4 text-amber-600 dark:text-amber-400" />;
    return <Circle className="size-4 text-gray-400 dark:text-slate-500" />;
}

function StudentLessonDetail({ detail }: { detail: IInstructorStudentDetail }) {
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
                        <span>{LESSON_STATUS_LABEL[lp.status]}</span>
                        {(lp.lesson_type === "test" ||
                            lp.lesson_type === "multiple_selection") &&
                        lp.attempts > 0 ? (
                            <span>
                                Nota:{" "}
                                {lp.best_score != null
                                    ? `${Math.round(lp.best_score)}%`
                                    : "—"}{" "}
                                · {lp.attempts} intento{lp.attempts !== 1 ? "s" : ""}
                            </span>
                        ) : null}
                        {lp.completed_at ? (
                            <span>
                                Completada {formatRelativeTime(lp.completed_at)}
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
            setError("Curso no válido");
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
                    setError("No se pudo cargar el listado de alumnos.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [courseId]);

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
                toast.error("No se pudo cargar el detalle del alumno");
                setExpandedUserId(null);
            } finally {
                setLoadingDetailId(null);
            }
        },
        [courseId, detailByUser, expandedUserId],
    );

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Cargando alumnos…
                </div>
            </div>
        );
    }

    if (error || !data || !course) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    {error ?? "No hay datos disponibles."}
                </div>
            </div>
        );
    }

    if (!canManage) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    No tienes permiso para ver el progreso de los alumnos de este curso.
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
                        ← Volver al curso
                    </Link>
                    <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
                        Alumnos — {data.course_title}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        Progreso de los estudiantes matriculados. Pulsa una fila para ver
                        el detalle por lección.
                    </p>
                </div>
                <Link
                    to={`/course/${courseId}/edit`}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                    Editar curso
                </Link>
            </div>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    icon={<Users className="size-5" />}
                    label="Matriculados"
                    value={String(data.students_count)}
                />
                <StatCard
                    icon={<GraduationCap className="size-5" />}
                    label="Completados"
                    value={String(data.completed_count)}
                />
                <StatCard
                    icon={<CheckCircle2 className="size-5" />}
                    label="Progreso medio"
                    value={`${Math.round(data.avg_progress_percent)}%`}
                />
                <StatCard
                    icon={<TrendingUp className="size-5" />}
                    label="Tasa de finalización"
                    value={`${Math.round(data.completion_rate * 100)}%`}
                />
                <StatCard
                    icon={<Star className="size-5" />}
                    label="Valoración media"
                    value={
                        data.avg_rating != null ? data.avg_rating.toFixed(1) : "—"
                    }
                />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        Completados por lección
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        Alumnos que han completado cada lección del curso.
                    </p>
                    <div className="mt-4">
                        <LessonCompletionChart data={lessonChartData} />
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        Distribución de progreso
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        Reparto de alumnos por tramo de progreso global.
                    </p>
                    <div className="mt-4">
                        <DistributionBarChart
                            data={progressBucketData}
                            height={180}
                            valueLabel="alumnos"
                        />
                    </div>
                </div>
            </section>

            <section className="mt-8">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        Cohortes por mes de matriculación
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        Comparativa de progreso colectivo entre cohortes de alumnos.
                    </p>
                    <div className="mt-4">
                        <CohortComparisonChart data={cohortChartData} height={220} />
                    </div>
                </div>
            </section>

            <section className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
                {data.students.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
                        Aún no hay alumnos matriculados en este curso.
                    </p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    Alumno
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    Estado
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    Progreso
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    Lecciones
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    Última actividad
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
                                                    {ENROLLMENT_STATUS_LABEL[student.status]}
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
                                                {formatRelativeTime(student.last_activity_at)}
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
                                                            Cargando lecciones…
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

            <SubmissionsPanel courseId={courseId} />
        </div>
    );
}
