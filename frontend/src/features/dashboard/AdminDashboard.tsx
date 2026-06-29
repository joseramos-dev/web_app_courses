import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, BookOpen, Star, TrendingUp, UserCheck, Users } from "lucide-react";
import type { IUser } from "../../shared/interfaces/IUser";
import type { IAdminDashboard } from "../../shared/interfaces/IDashboard";
import { difficultyLabels } from "../../shared/types/CourseTypes";
import { API_getAdminDashboard } from "./api";
import { StatCard } from "./components/StatCard";
import { ActivityBarChart } from "../../shared/components/charts/ActivityBarChart";
import { CohortComparisonChart } from "../../shared/components/charts/CohortComparisonChart";
import { DistributionBarChart } from "../../shared/components/charts/DistributionBarChart";
import { DistributionPieChart } from "../../shared/components/charts/DistributionPieChart";
import {
    formatCategoryLabel,
    formatCohortMonth,
} from "../../shared/components/charts/chartFormatters";

const DAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
});

export const AdminDashboard = ({ user }: { user: IUser }) => {
    const location = useLocation();
    const courseNavReturn = {
        returnTo: `${location.pathname}${location.search}`,
    };
    const [data, setData] = useState<IAdminDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    setError("No se pudo cargar el dashboard de admin.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

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
            label: formatCategoryLabel(c.category),
            value: c.enrollments_count,
        }));
    }, [data]);

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
            label: formatCohortMonth(c.cohort_month),
            enrollments_count: c.enrollments_count,
            avg_progress_percent: c.avg_progress_percent,
            completion_rate: c.completion_rate,
        }));
    }, [data]);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                        Panel de administración
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        Hola, {user.name}. Visión global del aprendizaje en la
                        plataforma.
                    </p>
                </div>
                <Link
                    to="/admin"
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    Gestión avanzada
                </Link>
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
                    {/* Stat cards globales */}
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <StatCard
                            icon={<Users className="size-5" />}
                            label="Estudiantes"
                            value={String(data.students_count)}
                            helper="Cuentas con rol student"
                        />
                        <StatCard
                            icon={<BookOpen className="size-5" />}
                            label="Cursos publicados"
                            value={String(data.courses_count)}
                        />
                        <StatCard
                            icon={<UserCheck className="size-5" />}
                            label="Matrículas activas"
                            value={String(data.active_enrollments_count)}
                            helper="Estudiantes en cursos en progreso"
                        />
                        <StatCard
                            icon={<Activity className="size-5" />}
                            label="Lecciones completadas"
                            value={String(data.total_lessons_completed)}
                            helper="Total acumulado en la plataforma"
                        />
                        <StatCard
                            icon={<TrendingUp className="size-5" />}
                            label="Tasa de finalización"
                            value={`${Math.round(data.completion_rate * 100)}%`}
                            helper={`${data.total_enrollments} matrículas totales`}
                        />
                        <StatCard
                            icon={<Star className="size-5" />}
                            label="Valoración media"
                            value={
                                data.avg_course_rating != null
                                    ? data.avg_course_rating.toFixed(1)
                                    : "—"
                            }
                            helper="Media de cursos valorados"
                        />
                    </section>

                    {/* Top cursos + top estudiantes */}
                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
                            <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-600">
                                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                    Cursos más populares
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    Ranking por número de matrículas
                                </p>
                            </div>
                            {data.top_courses.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                                    Aún no hay matrículas registradas.
                                </div>
                            ) : (
                                <ol className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {data.top_courses.map((c, idx) => (
                                        <li
                                            key={c.course_id}
                                            className="flex items-center justify-between px-4 py-2 text-sm"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-slate-700 dark:text-slate-200">
                                                    {idx + 1}
                                                </span>
                                                <Link
                                                    to={`/course/${c.course_id}`}
                                                    state={courseNavReturn}
                                                    className="text-gray-900 hover:underline dark:text-slate-100"
                                                >
                                                    {c.course_title}
                                                </Link>
                                            </span>
                                            <span className="text-gray-600 dark:text-slate-300">
                                                {c.enrollments_count} matrículas
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
                            <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-600">
                                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                    Estudiantes más activos
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    Por lecciones completadas en los últimos 30 días
                                </p>
                            </div>
                            {data.top_active_students.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                                    Sin actividad registrada todavía.
                                </div>
                            ) : (
                                <ol className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {data.top_active_students.map((s, idx) => (
                                        <li
                                            key={s.user_id}
                                            className="flex items-center justify-between px-4 py-2 text-sm"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-slate-700 dark:text-slate-200">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-gray-900 dark:text-slate-100">
                                                    {s.name}
                                                </span>
                                            </span>
                                            <span className="text-gray-600 dark:text-slate-300">
                                                {s.lessons_completed_in_window} lecciones
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </section>

                    {/* Distribución por categoría + actividad global */}
                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Distribución por categoría
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Reparto de matrículas por categoría de curso
                                {totalCategoryEnrollments > 0
                                    ? ` (${totalCategoryEnrollments} total)`
                                    : ""}
                                .
                            </p>
                            <div className="mt-4">
                                <DistributionBarChart data={categoryChartData} height={180} />
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Actividad de la plataforma
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Lecciones completadas por día (últimos 30).
                            </p>
                            <div className="mt-4">
                                <ActivityBarChart
                                    height={140}
                                    hideXLabels
                                    data={data.last_30_days.map((d) => ({
                                        label: "",
                                        value: d.lessons_completed,
                                        title: `${DAY_FORMATTER.format(new Date(d.date))}: ${d.lessons_completed} completadas`,
                                    }))}
                                />
                                <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-slate-500">
                                    <span>
                                        {data.last_30_days[0]
                                            ? DAY_FORMATTER.format(
                                                  new Date(data.last_30_days[0].date),
                                              )
                                            : ""}
                                    </span>
                                    <span>
                                        {data.last_30_days[data.last_30_days.length - 1]
                                            ? DAY_FORMATTER.format(
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
                        </div>
                    </section>

                    {/* Plataforma + dificultad */}
                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Matrículas por plataforma
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Comparativa entre Coursera, Future Learn, Udacity y otras fuentes.
                            </p>
                            <div className="mt-2">
                                <DistributionPieChart data={siteChartData} />
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Matrículas por dificultad
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Reparto según el nivel del curso matriculado.
                            </p>
                            <div className="mt-4">
                                <DistributionBarChart
                                    data={difficultyChartData}
                                    height={180}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Cohortes */}
                    <section className="mt-8">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Cohortes de matriculación
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Progreso colectivo y volumen de matrículas por mes (últimos 12 meses).
                            </p>
                            <div className="mt-4">
                                <CohortComparisonChart data={cohortChartData} height={220} />
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};
