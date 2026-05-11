import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronLeft } from "lucide-react";
import {
  API_completeLesson,
  API_getCourseLessonsForNav,
  API_getLesson,
  API_getLessonQuestions,
  API_startLesson,
  type ILessonAnswer,
} from "./api";
import { LessonText } from "./components/LessonText";
import { LessonVideo } from "./components/LessonVideo";
import { LessonQuiz } from "./components/LessonQuiz";
import { lessonBackToCourseButtonClassName } from "./components/lessonBackToCourseButtonClassName";
import { lessonErrorNoticePanelClassName } from "./components/lessonErrorNoticePanelClassName";
import { lessonMarkCompleteButtonClassName } from "./components/lessonMarkCompleteButtonClassName";
import { lessonMutedNoticePanelClassName } from "./components/lessonMutedNoticePanelClassName";
import { lessonPageShellClassName } from "./components/lessonPageShellClassName";
import { navigateBackToCourseFromLesson } from "./components/navigateBackToCourseFromLesson";
import { runWithSubmitting } from "./components/runWithSubmitting";
import { tryNavigateAwayOnLessonHttpError } from "./components/tryNavigateAwayOnLessonHttpError";
import type { ILesson, IQuestionPublic } from "../course_edit/lessonTypes";
import {
  KURSA_COURSE_ENROLLMENT_CHANGED_EVENT,
  KURSA_DASHBOARD_REFRESH_EVENT,
} from "../../shared/constants/appEvents";
import {
  lessonChainState,
  resolveReturnTo,
} from "../../shared/types/CourseNavState";

export const Lesson = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [lesson, setLesson] = useState<ILesson | null>(null);
  const [siblings, setSiblings] = useState<ILesson[]>([]);
  const [questions, setQuestions] = useState<IQuestionPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const courseIdNum = Number(courseId);
  const lessonIdNum = Number(lessonId);

  const shellCn = lessonPageShellClassName();
  const mutedPanelCn = lessonMutedNoticePanelClassName();
  const errorPanelCn = lessonErrorNoticePanelClassName();
  const backBtnCn = lessonBackToCourseButtonClassName();
  const markCompleteCn = lessonMarkCompleteButtonClassName();

  const nextLessonId = useMemo(() => {
    if (!lesson || siblings.length === 0) return null;
    const sorted = [...siblings].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((l) => l.id === lesson.id);
    if (idx === -1) return null;
    const next = sorted[idx + 1];
    return next ? next.id : null;
  }, [lesson, siblings]);

  useEffect(() => {
    const fetchAll = async () => {
      if (Number.isNaN(courseIdNum) || Number.isNaN(lessonIdNum)) {
        setError("Lección no válida.");
        return;
      }
      try {
        setIsLoading(true);
        setError(null);

        const lessonReq = API_getLesson(lessonIdNum);
        const navReq = API_getCourseLessonsForNav(courseIdNum);
        const startReq = API_startLesson(lessonIdNum);
        const [lessonData, navData] = await Promise.all([lessonReq, navReq]);
        setLesson(lessonData);
        setSiblings(navData);

        try {
          await startReq;
        } catch (e) {
          const handled = tryNavigateAwayOnLessonHttpError({
            error: e,
            navigate,
            courseId: courseIdNum,
            locationState: location.state,
            treatForbiddenOrNotFoundAsEnrollment: true,
          });
          if (handled) return;
          throw e;
        }

        if (
          lessonData.lesson_type === "test" ||
          lessonData.lesson_type === "multiple_selection"
        ) {
          const qs = await API_getLessonQuestions(lessonIdNum);
          setQuestions(qs);
        }
      } catch (e) {
        console.error(e);
        const handled = tryNavigateAwayOnLessonHttpError({
          error: e,
          navigate,
          courseId: courseIdNum,
          locationState: location.state,
        });
        if (handled) return;
        setError("No se pudo cargar la lección.");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchAll();
  }, [courseIdNum, lessonIdNum, navigate]);

  const handleAfterPass = (enrollmentCompleted: boolean) => {
    window.dispatchEvent(new Event(KURSA_DASHBOARD_REFRESH_EVENT));
    window.dispatchEvent(
      new CustomEvent(KURSA_COURSE_ENROLLMENT_CHANGED_EVENT, {
        detail: { courseId: courseIdNum },
      }),
    );
    if (nextLessonId !== null) {
      toast.success("Lección superada!");
      navigate(`/course/${courseIdNum}/lesson/${nextLessonId}`, {
        state: lessonChainState(location.state),
      });
      return;
    }
    if (enrollmentCompleted) {
      toast.success("¡Curso completado!");
    } else {
      toast.success("Lección superada!");
    }
    navigate(`/course/${courseIdNum}`, {
      state: {
        returnTo: resolveReturnTo(location.state),
        fromLessonProgress: Date.now(),
      },
    });
  };

  const handleMarkComplete = async () => {
    if (!lesson) return;
    const result = await runWithSubmitting(
      setSubmitting,
      () => API_completeLesson(lesson.id),
      "No se pudo marcar la lección como completada.",
    );
    if (result) handleAfterPass(result.enrollment_completed);
  };

  const handleQuizSubmit = async (answers: ILessonAnswer[]) => {
    if (!lesson) return;
    const result = await runWithSubmitting(
      setSubmitting,
      () => API_completeLesson(lesson.id, answers),
      "No se pudieron enviar las respuestas.",
    );
    if (!result) return;
    setLastScore(result.score);
    if (result.passed) {
      handleAfterPass(result.enrollment_completed);
    } else {
      toast.error(
        `No has alcanzado el 70% (puntuación: ${Math.round(
          result.score ?? 0,
        )}%). Inténtalo de nuevo.`,
      );
    }
  };

  if (isLoading) {
    return (
      <div className={shellCn}>
        <div className={mutedPanelCn}>Cargando lección...</div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className={shellCn}>
        <div className={errorPanelCn}>
          {error ?? "Lección no encontrada."}
        </div>
      </div>
    );
  }

  return (
    <div className={shellCn}>
      <div className="mb-4">
        <button
          type="button"
          onClick={() =>
            navigateBackToCourseFromLesson(
              navigate,
              courseIdNum,
              location.state,
            )
          }
          className={backBtnCn}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Volver al curso
        </button>
      </div>

      <header className="mb-4">
        <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">
          Lección {lesson.position} ·{" "}
          {lesson.lesson_type.replace("_", " ")}
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">
          {lesson.title}
        </h1>
      </header>

      <div className="mb-6">
        {lesson.lesson_type === "text" && (
          <LessonText body={lesson.body} />
        )}
        {lesson.lesson_type === "video" && (
          <LessonVideo videoUrl={lesson.video_url} />
        )}
        {(lesson.lesson_type === "test" ||
          lesson.lesson_type === "multiple_selection") && (
          <LessonQuiz
            questions={questions}
            mode={lesson.lesson_type === "test" ? "single" : "multiple"}
            submitting={submitting}
            onSubmit={handleQuizSubmit}
            lastScore={lastScore}
          />
        )}
      </div>

      {(lesson.lesson_type === "text" || lesson.lesson_type === "video") && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleMarkComplete()}
            disabled={submitting}
            className={markCompleteCn}
          >
            {submitting ? "Marcando…" : "Marcar como completada"}
          </button>
        </div>
      )}
    </div>
  );
};
