import type { ILessonAttemptList } from "../../../shared/interfaces/IProgress";
import { formatRelativeTime } from "../../dashboard/components/formatRelativeTime";

type Props = {
    data: ILessonAttemptList | null;
    loading?: boolean;
};

export function LessonAttemptHistory({ data, loading }: Props) {
    if (loading) {
        return (
            <p className="text-sm text-gray-500 dark:text-slate-400">
                Cargando historial de intentos…
            </p>
        );
    }

    if (!data || data.attempts.length === 0) {
        return (
            <p className="text-sm text-gray-500 dark:text-slate-400">
                Aún no hay intentos registrados en esta lección.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                <span>
                    Mejor nota:{" "}
                    {data.best_score != null ? `${Math.round(data.best_score)}%` : "—"}
                </span>
                <span>
                    {data.total_attempts} intento{data.total_attempts !== 1 ? "s" : ""}
                </span>
            </div>
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-slate-700 dark:border-slate-600">
                {data.attempts.map((attempt) => (
                    <li
                        key={attempt.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-slate-100">
                                {Math.round(attempt.score)}%
                            </span>
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    attempt.passed
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                }`}
                            >
                                {attempt.passed ? "Aprobado" : "No superado"}
                            </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                            {formatRelativeTime(attempt.attempted_at)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
