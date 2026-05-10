import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    BookOpen,
    GraduationCap,
    TrendingUp,
    Users,
} from "lucide-react";
import type { IUser } from "../../shared/interfaces/IUser";
import type { IInstructorDashboard } from "../../shared/interfaces/IDashboard";
import { API_getInstructorDashboard } from "./api";
import { StatCard } from "./components/StatCard";
import { ProgressBar } from "./components/ProgressBar";
import { formatRelativeTime } from "./components/formatRelativeTime";

export const InstructorDashboard = ({ user }: { user: IUser }) => {
    const location = useLocation();
    const courseNavReturn = {
        returnTo: `${location.pathname}${location.search}`,
    };
    const [data, setData] = useState<IInstructorDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    setError("No se pudo cargar el dashboard del instructor.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">
                    Panel del instructor
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Hola, {user.name}. Aquí puedes seguir el progreso de tus
                    alumnos en cada uno de tus cursos.
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
                            label="Mis cursos"
                            value={String(data.courses_count)}
                            helper="Cursos asignados"
                        />
                        <StatCard
                            icon={<Users className="size-5" />}
                            label="Alumnos matriculados"
                            value={String(data.total_students)}
                            helper="Total en todos tus cursos"
                        />
                        <StatCard
                            icon={<TrendingUp className="size-5" />}
                            label="Progreso medio"
                            value={`${Math.round(data.avg_progress_percent)}%`}
                            helper="Media por matrícula"
                        />
                        <StatCard
                            icon={<GraduationCap className="size-5" />}
                            label="Alumnos completados"
                            value={String(data.completed_students)}
                        />
                    </section>

                    {/* Cursos del instructor */}
                    <section className="mt-8">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-base font-semibold text-gray-900">
                                Mis cursos
                            </h2>
                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    to="/course/new"
                                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                                >
                                    Crear curso
                                </Link>
                                <Link
                                    to="/courses"
                                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                >
                                    Ir al catálogo
                                </Link>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                                <thead className="bg-gray-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            Curso
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            Alumnos
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            Progreso medio
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            Completados
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                            Última actividad
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {data.courses.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400"
                                            >
                                                Aún no tienes cursos. Puedes crear uno con
                                                «Crear curso» o esperar a que un administrador
                                                te asigne cursos; entonces aparecerán aquí con
                                                las métricas de tus alumnos.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.courses.map((row) => (
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
                                                        <ProgressBar
                                                            value={row.avg_progress_percent}
                                                            rightLabel={`${Math.round(row.avg_progress_percent)}%`}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                                                    {row.completed_students}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                                                    {formatRelativeTime(row.last_activity_at)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Alumnos recientes + lecciones más completadas */}
                    <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Alumnos más activos
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                Por lecciones completadas en los últimos 7 días en
                                tus cursos.
                            </p>
                            {data.top_active_students.length === 0 ? (
                                <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                                    Sin actividad de alumnos en los últimos 7 días.
                                </p>
                            ) : (
                                <ol className="mt-3 divide-y divide-gray-100 dark:divide-slate-700">
                                    {data.top_active_students.map((s, idx) => (
                                        <li
                                            key={s.user_id}
                                            className="flex items-center justify-between py-2 text-sm"
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

                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                Lecciones más completadas
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                Lecciones de tus cursos con más finalizaciones.
                            </p>
                            {data.top_completed_lessons.length === 0 ? (
                                <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                                    Aún no se han completado lecciones en tus cursos.
                                </p>
                            ) : (
                                <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-700">
                                    {data.top_completed_lessons.map((l) => (
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
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};
