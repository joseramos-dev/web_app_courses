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
import { formatCategoryLabel } from "../../shared/components/charts/chartFormatters";
import type { IPublicStats } from "../../shared/interfaces/IDashboard";
import { useAuth } from "../../shared/povider/AuthContext";
import { useAuthModal } from "../../shared/context/AuthModalContext";
import {
    lessonTypeLabels,
    publicStatsPeriodLabels,
    type PublicStatsPeriod,
} from "../../shared/types/LessonTypes";
import type { LessonType } from "../course_edit/lessonTypes";

const DAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
});

const PERIOD_HELPERS: Record<PublicStatsPeriod, string> = {
    day: "Hoy",
    week: "Últimos 7 días",
    month: "Últimos 30 días",
};

export function LandingPage() {
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
                    setError("No se pudieron cargar las estadísticas de la plataforma.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [period]);

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

    const lessonTypeChartData = useMemo(() => {
        if (!data) return [];
        return data.lesson_completions_by_type.map((row) => ({
            label:
                lessonTypeLabels[row.lesson_type as LessonType] ??
                row.lesson_type,
            value: row.completed_count,
        }));
    }, [data]);

    const activityChartData = useMemo(() => {
        if (!data) return [];
        return data.activity_series.map((d) => ({
            label: "",
            value: d.lessons_completed,
            title: `${DAY_FORMATTER.format(new Date(d.date))}: ${d.lessons_completed} completadas`,
        }));
    }, [data]);

    return (
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-uned-primary/10 via-white to-slate-50 px-6 py-10 dark:border-slate-600 dark:from-uned-primary/20 dark:via-slate-900 dark:to-slate-800 sm:px-10">
                <div className="relative z-10 max-w-2xl">
                    <p className="text-sm font-medium uppercase tracking-wide text-uned-primary">
                        Plataforma de aprendizaje online
                    </p>
                    <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100 sm:text-4xl">
                        Descubre qué se aprende en Kursa
                    </h1>
                    <p className="mt-3 text-base text-gray-600 dark:text-slate-300">
                        Estadísticas agregadas de la comunidad: cursos más
                        populares, categorías con más matrículas y actividad
                        reciente en la plataforma.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            to="/courses"
                            className="inline-flex items-center gap-2 rounded-lg bg-uned-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-uned-primary/90"
                        >
                            Explorar cursos
                            <ArrowRight className="size-4" />
                        </Link>
                        {!user && (
                            <>
                                <button
                                    type="button"
                                    onClick={openRegister}
                                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                >
                                    Registrarse
                                </button>
                                <button
                                    type="button"
                                    onClick={openLogin}
                                    className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100"
                                >
                                    Iniciar sesión
                                </button>
                            </>
                        )}
                        {user && (
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                            >
                                <GraduationCap className="size-4" />
                                Mi dashboard
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <section className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            Actividad de la plataforma
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            {PERIOD_HELPERS[period]}
                        </p>
                    </div>
                    <div
                        className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
                        role="tablist"
                        aria-label="Periodo de estadísticas"
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
                    Cargando estadísticas...
                </div>
            ) : error || !data ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error ?? "No hay datos disponibles."}
                </div>
            ) : (
                <>
                    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            icon={<BookOpen className="size-5" />}
                            label="Cursos en catálogo"
                            value={String(data.courses_count)}
                        />
                        <StatCard
                            icon={<TrendingUp className="size-5" />}
                            label="Matrículas totales"
                            value={String(data.total_enrollments)}
                        />
                        <StatCard
                            icon={<UserCheck className="size-5" />}
                            label="Matrículas activas"
                            value={String(data.active_enrollments_count)}
                            helper="Cursos en progreso"
                        />
                        <StatCard
                            icon={<Activity className="size-5" />}
                            label="Lecciones completadas"
                            value={String(data.lessons_completed_in_period)}
                            helper={PERIOD_HELPERS[period].toLowerCase()}
                        />
                    </section>

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
                                Matrículas por categoría
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Secciones con más registros
                                {totalCategoryEnrollments > 0
                                    ? ` (${totalCategoryEnrollments} total)`
                                    : ""}
                                .
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
                                            {formatCategoryLabel(c.category)}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Lecciones completadas por día
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Actividad global en el periodo seleccionado.
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
                                            {DAY_FORMATTER.format(
                                                new Date(data.activity_series[0].date),
                                            )}
                                        </span>
                                        <span>
                                            {DAY_FORMATTER.format(
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
                                Completados por tipo de lección
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Desglose en {PERIOD_HELPERS[period].toLowerCase()}.
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
