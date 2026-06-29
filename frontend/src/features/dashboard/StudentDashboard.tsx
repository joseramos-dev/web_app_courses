import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, CheckCircle2, GraduationCap, Flame, Trophy, BarChart3 } from "lucide-react";
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
import { KURSA_DASHBOARD_REFRESH_EVENT } from "../../shared/constants/appEvents";
import { RecommendedCoursesCarousel } from "../../shared/components/RecommendedCoursesCarousel";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
});

const STATUS_LABEL: Record<LessonProgressStatus, string> = {
    not_started: "Pendiente",
    in_progress: "En progreso",
    completed: "Completada",
};

const STATUS_BADGE_CLASS: Record<LessonProgressStatus, string> = {
    not_started: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200",
};

export const StudentDashboard = ({ user }: { user: IUser }) => {
    const location = useLocation();
    const courseNavReturn = {
        returnTo: `${location.pathname}${location.search}`,
    };
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
                if (!cancelled) setError("No se pudo cargar el dashboard.");
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
    }, [location.key]);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                    Hola, {user.name}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    Aquí tienes un resumen de tu aprendizaje.
                </p>
            </header>

            {loading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Cargando dashboard...
                </div>
            ) : error || !data ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error ?? "No hay datos disponibles."}
                </div>
            ) : (
                <>
                    {/* Stat cards */}
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            icon={<BookOpen className="size-5" />}
                            label="Cursos en progreso"
                            value={String(data.in_progress_count)}
                            helper={
                                data.in_progress_count === 0
                                    ? "Aún no estás matriculado en ningún curso"
                                    : undefined
                            }
                        />
                        <StatCard
                            icon={<CheckCircle2 className="size-5" />}
                            label="Cursos completados"
                            value={String(data.completed_count)}
                        />
                        <StatCard
                            icon={<GraduationCap className="size-5" />}
                            label="Lecciones completadas"
                            value={String(data.total_lessons_completed)}
                            helper="Total acumulado"
                        />
                        <StatCard
                            icon={<Flame className="size-5" />}
                            label="Racha actual"
                            value={`${data.streak_days} ${
                                data.streak_days === 1 ? "día" : "días"
                            }`}
                            helper="Días consecutivos con lección completada"
                        />
                    </section>

                    {/* Rendimiento en evaluaciones */}
                    <section className="mt-8">
                        <div className="mb-3 flex items-center gap-2">
                            <BarChart3 className="size-5 text-uned-primary dark:text-uned-primary" />
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Rendimiento en evaluaciones
                            </h2>
                        </div>

                        {!performance || performance.total_attempts === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center dark:border-slate-600 dark:bg-slate-800">
                                <p className="text-sm text-gray-600 dark:text-slate-300">
                                    Aún no has realizado evaluaciones con puntuación.
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    Cuando completes tests o cuestionarios, verás aquí tu media y
                                    la comparativa con el resto de alumnos.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <StatCard
                                        icon={<BarChart3 className="size-5" />}
                                        label="Nota media global"
                                        value={
                                            performance.overall_avg_score != null
                                                ? `${Math.round(performance.overall_avg_score)}%`
                                                : "—"
                                        }
                                        helper="Media de tus mejores notas por test"
                                    />
                                    <StatCard
                                        icon={<CheckCircle2 className="size-5" />}
                                        label="Total intentos"
                                        value={String(performance.total_attempts)}
                                        helper="En tests y cuestionarios"
                                    />
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                            Tu media por curso
                                        </h3>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                            Mejor nota media en tests de cada curso.
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
                                            Tu media vs media de la cohorte
                                        </h3>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                            Comparativa por curso con otros alumnos matriculados.
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
                                        Intentos recientes
                                    </h3>
                                    {performance.recent_attempts.length === 0 ? (
                                        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                                            No hay intentos registrados todavía.
                                        </p>
                                    ) : (
                                        <div className="mt-3 overflow-x-auto">
                                            <table className="w-full min-w-[480px] text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400">
                                                        <th className="pb-2 pr-3 font-medium">Curso</th>
                                                        <th className="pb-2 pr-3 font-medium">Lección</th>
                                                        <th className="pb-2 pr-3 font-medium">Nota</th>
                                                        <th className="pb-2 pr-3 font-medium">Estado</th>
                                                        <th className="pb-2 font-medium">Fecha</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                                    {performance.recent_attempts.map((a) => (
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
                                                                    {a.passed ? "Aprobado" : "Suspenso"}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 text-xs text-gray-500 dark:text-slate-400">
                                                                {formatRelativeTime(a.attempted_at)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
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
                                Cursos terminados
                            </h2>
                        </div>
                        {(data.completed_courses ?? []).length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center dark:border-slate-600 dark:bg-slate-800">
                                <p className="text-sm text-gray-600 dark:text-slate-300">
                                    Aún no has terminado ningún curso al 100%.
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    Al completar todas las lecciones, el curso aparecerá en esta lista.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {(data.completed_courses ?? []).map((c) => (
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
                                                Completado
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                                            {c.completed_at
                                                ? `Terminado ${formatRelativeTime(c.completed_at)}`
                                                : "Curso finalizado"}
                                        </p>
                                        <div className="mt-3 flex justify-end">
                                            <Link
                                                to={`/course/${c.course_id}`}
                                                state={courseNavReturn}
                                                className="text-xs font-semibold text-uned-primary hover:text-uned-primary-hover dark:text-uned-primary"
                                            >
                                                Ver ficha del curso →
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Continue learning */}
                    <section className="mt-8">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Continuar aprendiendo
                            </h2>
                            <Link
                                to="/courses"
                                className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100"
                            >
                                Ver todos los cursos
                            </Link>
                        </div>

                        {data.recent_courses.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-slate-500 dark:bg-slate-800">
                                <p className="text-sm text-gray-600 dark:text-slate-300">
                                    Todavía no tienes cursos en marcha.
                                </p>
                                <Link
                                    to="/courses"
                                    className="mt-3 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                                >
                                    Explorar cursos
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {data.recent_courses.map((c) => {
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
                                                    rightLabel={`${c.completed_lessons_count}/${c.total_lessons} lecciones`}
                                                />
                                            </div>
                                            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                                                <span>
                                                    Última actividad{" "}
                                                    {formatRelativeTime(
                                                        c.last_activity_at,
                                                    )}
                                                </span>
                                                <Link
                                                    to={continueHref}
                                                    state={courseNavReturn}
                                                    className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                                                >
                                                    Continuar
                                                </Link>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Activity */}
                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Actividad reciente
                            </h2>
                            {data.recent_lessons.length === 0 ? (
                                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                                    Cuando empieces a estudiar lecciones, verás aquí tu
                                    actividad más reciente.
                                </p>
                            ) : (
                                <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-700">
                                    {data.recent_lessons.map((l) => (
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
                                                    {STATUS_LABEL[l.status]}
                                                </span>
                                                <span className="text-[11px] text-gray-400 dark:text-slate-500">
                                                    {formatRelativeTime(
                                                        l.last_activity_at,
                                                    )}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Tu semana de estudio
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Lecciones completadas en los últimos 7 días.
                            </p>
                            <div className="mt-4">
                                <ActivityBarChart
                                    data={data.last_7_days.map((d) => ({
                                        // The chart cell shows the weekday initial,
                                        // tooltip the full ISO date.
                                        label: WEEKDAY_FORMATTER.format(
                                            new Date(d.date),
                                        ),
                                        value: d.lessons_completed,
                                        title: `${d.date}: ${d.lessons_completed} completadas`,
                                    }))}
                                    showValues
                                />
                            </div>
                        </div>
                    </section>
                </>
            )}

            <RecommendedCoursesCarousel className="mt-10" />
        </div>
    );
};
