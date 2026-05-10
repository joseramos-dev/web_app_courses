import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  API_getMyCourseRating,
  API_putCourseRating,
} from "../api";

type Props = {
  courseId: number;
  onRated: () => void;
  /** Curso sin lecciones: el alumno puede valorar igualmente. */
  emptyCourse?: boolean;
};

export function StudentCourseRating({ courseId, onRated, emptyCourse }: Props) {
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await API_getMyCourseRating(courseId);
      setCurrentScore(row?.score ?? null);
    } catch {
      setCurrentScore(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (score: number) => {
    try {
      setSaving(true);
      await API_putCourseRating(courseId, score);
      setCurrentScore(score);
      toast.success("Valoración guardada");
      onRated();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo guardar la valoración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
        Cargando tu valoración…
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
      <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
        Tu valoración
      </div>
      <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
        {emptyCourse
          ? "Este curso aún no tiene lecciones. Puedes valorar tu experiencia como alumno matriculado."
          : "Del 1 al 5. Puedes cambiarla cuando quieras."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={saving}
            onClick={() => submit(n)}
            className={`min-w-10 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
              currentScore === n
                ? "border-amber-600 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-600"
                : "border-gray-200 bg-white text-gray-800 hover:border-amber-400 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:border-amber-500/60"
            } disabled:opacity-50`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
