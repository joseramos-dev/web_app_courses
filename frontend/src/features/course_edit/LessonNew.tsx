import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import type { ICourses } from "../../shared/interfaces/ICourses";
import { useAuth } from "../../shared/povider/AuthContext";
import { API_getCourseDetailById } from "../course_detail/api";
import type { ILesson, ILessonCreate, LessonType } from "./lessonTypes";
import { API_createLesson, API_getLessonsByCourse } from "./api";

const lessonTypes: LessonType[] = [
  "text",
  "video",
  "test",
  "multiple_selection",
  "assignment",
];

export function LessonNew() {
  const { courseId: courseIdParam } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();

  const courseIdNum = Number(courseIdParam);
  const invalidId = courseIdParam == null || Number.isNaN(courseIdNum);

  const [course, setCourse] = useState<ICourses | null>(null);
  const [lessons, setLessons] = useState<ILesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState<LessonType>("text");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [passingScore, setPassingScore] = useState("70");
  const [allowsFileSubmission, setAllowsFileSubmission] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (invalidId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [detail, list] = await Promise.all([
          API_getCourseDetailById(courseIdNum),
          API_getLessonsByCourse(courseIdNum),
        ]);
        if (!cancelled) {
          setCourse(detail);
          setLessons(list);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("No se pudo cargar el curso.");
          setCourse(null);
          setLessons([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseIdNum, invalidId]);

  const canEdit = useMemo(() => {
    if (!user || !course) return false;
    if (user.role === "admin") return true;
    if (
      user.role === "instructor" &&
      course.instructor_id !== null &&
      user.id === course.instructor_id
    )
      return true;
    return false;
  }, [course, user]);

  const nextPosition = useMemo(() => {
    const sorted = [...lessons].sort((a, b) => a.position - b.position);
    if (sorted.length === 0) return 1;
    return Math.max(...sorted.map((l) => l.position)) + 1;
  }, [lessons]);

  const canSubmit =
    lessonTitle.trim().length > 0 && canEdit && !submitting && !invalidId;

  const isQuiz =
    lessonType === "test" || lessonType === "multiple_selection";
  const isAssignment = lessonType === "assignment";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload: ILessonCreate = {
      title: lessonTitle.trim(),
      lesson_type: lessonType,
      position: nextPosition,
      body:
        lessonType === "text" || lessonType === "assignment" ? body : null,
      video_url: lessonType === "video" ? videoUrl.trim() || null : null,
      max_score: isAssignment ? Number(maxScore) || 100 : null,
      passing_score: isAssignment ? Number(passingScore) || 70 : null,
      allows_file_submission: isAssignment ? allowsFileSubmission : false,
    };
    try {
      setSubmitting(true);
      await API_createLesson(courseIdNum, payload);
      toast.success("Lección creada");
      navigate(`/course/${courseIdNum}/edit`, { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo crear la lección.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthLoading) return null;
  if (!user) return <Navigate to="/courses" replace />;
  if (invalidId) return <Navigate to="/courses" replace />;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Cargando…
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error ?? "Curso no encontrado."}
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          No tienes permiso para editar este curso.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(`/course/${courseIdNum}/edit`)}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:shadow-md dark:hover:bg-slate-700"
        >
          Volver al editor
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-surface-muted p-5 shadow-sm dark:border-slate-600 dark:bg-slate-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Nueva lección</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Curso: {course.title}. Se añadirá en la posición {nextPosition} (al
          final).
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 sm:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Título
            </div>
            <input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
            />
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Tipo
            </div>
            <select
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
            >
              {lessonTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {lessonType === "text" && (
            <label className="flex flex-col gap-2 sm:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                Contenido (markdown)
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
              />
            </label>
          )}

          {isAssignment && (
            <>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  Enunciado
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Instrucciones de la tarea para el alumno…"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  Puntuación máxima
                </div>
                <input
                  type="number"
                  min={1}
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  Nota mínima para aprobar
                </div>
                <input
                  type="number"
                  min={0}
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={allowsFileSubmission}
                  onChange={(e) => setAllowsFileSubmission(e.target.checked)}
                  className="size-4 rounded border-gray-300 dark:border-slate-600"
                />
                <span className="text-sm text-gray-700 dark:text-slate-200">
                  Permitir adjuntar archivo
                </span>
              </label>
            </>
          )}

          {lessonType === "video" && (
            <label className="flex flex-col gap-2 sm:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                URL del vídeo (YouTube / Vimeo)
              </div>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
              />
            </label>
          )}

          {isQuiz && (
            <p className="sm:col-span-2 text-xs text-gray-500 dark:text-slate-400">
              Guarda la lección primero; luego podrás añadir preguntas desde el
              editor del curso (Editar).
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/course/${courseIdNum}/edit`)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent disabled:dark:border-slate-600 disabled:dark:bg-slate-700 disabled:dark:text-slate-500"
          >
            {submitting ? "Guardando…" : "Crear lección"}
          </button>
        </div>
      </div>
    </div>
  );
}
