import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLessonTypeLabels } from "../../shared/types/LessonTypes";
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
import { LessonAssignment } from "./components/LessonAssignment";
import { LessonAttachments } from "./components/LessonAttachments";
import { lessonBackToCourseButtonClassName } from "./components/lessonBackToCourseButtonClassName";
import { lessonErrorNoticePanelClassName } from "./components/lessonErrorNoticePanelClassName";
import { lessonMarkCompleteButtonClassName } from "./components/lessonMarkCompleteButtonClassName";
import { lessonMutedNoticePanelClassName } from "./components/lessonMutedNoticePanelClassName";
import { lessonPageShellClassName } from "./components/lessonPageShellClassName";
import { navigateBackToCourseFromLesson } from "./components/navigateBackToCourseFromLesson";
import { runWithSubmitting } from "./components/runWithSubmitting";
import { tryNavigateAwayOnLessonHttpError } from "./components/tryNavigateAwayOnLessonHttpError";
import type { ILesson, ILessonFile, IQuestionPublic } from "../course_edit/lessonTypes";
import { API_getLessonFiles } from "../course_edit/api";
import {
  KURSA_COURSE_ENROLLMENT_CHANGED_EVENT,
  KURSA_DASHBOARD_REFRESH_EVENT,
} from "../../shared/constants/appEvents";
import {
  lessonChainState,
  resolveReturnTo,
} from "../../shared/types/CourseNavState";
import { API_getLessonAttempts } from "../progress/api";
import {
  API_getLessonSubmission,
  API_submitLessonAssignment,
} from "../progress/submissionApi";
import type { ILessonAttemptList } from "../../shared/interfaces/IProgress";
import type { ISubmission } from "../../shared/interfaces/ISubmission";
import { LessonAttemptHistory } from "./components/LessonAttemptHistory";

export const Lesson = () => {
  const { t } = useTranslation();
  const lessonTypeLabels = getLessonTypeLabels(t);
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
  const [attemptHistory, setAttemptHistory] = useState<ILessonAttemptList | null>(
    null,
  );
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attachments, setAttachments] = useState<ILessonFile[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [submission, setSubmission] = useState<ISubmission | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);

  const loadAttemptHistory = async (id: number) => {
    try {
      setAttemptsLoading(true);
      const history = await API_getLessonAttempts(id);
      setAttemptHistory(history);
      if (history.best_score != null) {
        setLastScore(history.best_score);
      }
    } catch (e) {
      console.error(e);
      setAttemptHistory(null);
    } finally {
      setAttemptsLoading(false);
    }
  };

  const loadSubmission = async (id: number) => {
    try {
      setSubmissionLoading(true);
      const data = await API_getLessonSubmission(id);
      setSubmission(data);
    } catch (e) {
      console.error(e);
      setSubmission(null);
    } finally {
      setSubmissionLoading(false);
    }
  };

  const courseIdNum = Number(courseId);
  const lessonIdNum = Number(lessonId);

  const shellCn = lessonPageShellClassName(lesson?.lesson_type);
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
        setError(t("lessonPage.invalidLesson"));
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
          setAttachmentsLoading(true);
          const files = await API_getLessonFiles(lessonIdNum);
          setAttachments(files);
        } catch (e) {
          console.error(e);
          setAttachments([]);
        } finally {
          setAttachmentsLoading(false);
        }

        let progressBestScore: number | null = null;
        try {
          const progress = await startReq;
          progressBestScore = progress.best_score ?? null;
        } catch (e) {
          const handled = tryNavigateAwayOnLessonHttpError({
            error: e,
            navigate,
            courseId: courseIdNum,
            locationState: location.state,
            treatForbiddenOrNotFoundAsEnrollment: true,
          });
          if (handled) return;
          // The lesson itself already loaded fine; a transient failure
          // marking it as "started" shouldn't block the student from
          // viewing it (retrying will register the progress anyway).
          console.error("No se pudo registrar el inicio de la lección:", e);
          toast.error(t("lessonPage.progressUpdateFailed"));
        }

        if (
          lessonData.lesson_type === "test" ||
          lessonData.lesson_type === "multiple_selection"
        ) {
          const qs = await API_getLessonQuestions(lessonIdNum);
          setQuestions(qs);
          if (progressBestScore != null) {
            setLastScore(progressBestScore);
          }
          await loadAttemptHistory(lessonIdNum);
        } else if (lessonData.lesson_type === "assignment") {
          await loadSubmission(lessonIdNum);
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
        setError(t("lessonPage.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };
    void fetchAll();
  }, [courseIdNum, lessonIdNum, navigate, t]);

  const handleAfterPass = (enrollmentCompleted: boolean) => {
    window.dispatchEvent(new Event(KURSA_DASHBOARD_REFRESH_EVENT));
    window.dispatchEvent(
      new CustomEvent(KURSA_COURSE_ENROLLMENT_CHANGED_EVENT, {
        detail: { courseId: courseIdNum },
      }),
    );
    if (nextLessonId !== null) {
      toast.success(t("lessonPage.passed"));
      navigate(`/course/${courseIdNum}/lesson/${nextLessonId}`, {
        state: lessonChainState(location.state),
      });
      return;
    }
    if (enrollmentCompleted) {
      toast.success(t("lessonPage.courseCompleted"));
    } else {
      toast.success(t("lessonPage.passed"));
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
      t("lessonPage.markCompleteFailed"),
    );
    if (result) handleAfterPass(result.enrollment_completed);
  };

  const handleQuizSubmit = async (answers: ILessonAnswer[]) => {
    if (!lesson) return;
    const result = await runWithSubmitting(
      setSubmitting,
      () => API_completeLesson(lesson.id, answers),
      t("lessonPage.submitAnswersFailed"),
    );
    if (!result) return;
    setLastScore(result.score);
    if (!result.passed) {
      toast.error(
        t("lessonPage.failedAttempt", { score: Math.round(result.score ?? 0) }),
      );
      await loadAttemptHistory(lesson.id);
      return;
    }
    handleAfterPass(result.enrollment_completed);
  };

  const handleAssignmentSubmit = async (content: string, file?: File | null) => {
    if (!lesson) return;
    const result = await runWithSubmitting(
      setSubmitting,
      () => API_submitLessonAssignment(lesson.id, { content, file }),
      t("lessonPage.submitAssignmentFailed"),
    );
    if (!result) return;
    setSubmission(result);
    toast.success(t("lessonPage.submissionSent"));
    window.dispatchEvent(new Event(KURSA_DASHBOARD_REFRESH_EVENT));
    window.dispatchEvent(
      new CustomEvent(KURSA_COURSE_ENROLLMENT_CHANGED_EVENT, {
        detail: { courseId: courseIdNum },
      }),
    );
  };

  if (isLoading) {
    return (
      <div className={shellCn}>
        <div className={mutedPanelCn}>{t("lessonPage.loading")}</div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className={shellCn}>
        <div className={errorPanelCn}>
          {error ?? t("lessonPage.notFound")}
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
          {t("lessonPage.backToCourse")}
        </button>
      </div>

      <header className="mb-4">
        <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">
          {t("lessonPage.lessonNumber", { position: lesson.position })} ·{" "}
          {lessonTypeLabels[lesson.lesson_type]}
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
          <>
            <LessonQuiz
              questions={questions}
              mode={lesson.lesson_type === "test" ? "single" : "multiple"}
              submitting={submitting}
              onSubmit={handleQuizSubmit}
              lastScore={lastScore}
            />
            <section className="mt-6 rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {t("lessonPage.attemptHistory.title")}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {t("lessonPage.attemptHistory.subtitle")}
              </p>
              <div className="mt-3">
                <LessonAttemptHistory
                  data={attemptHistory}
                  loading={attemptsLoading}
                />
              </div>
            </section>
          </>
        )}
        {lesson.lesson_type === "assignment" && (
          submissionLoading ? (
            <div className={mutedPanelCn}>{t("lessonPage.loadingSubmission")}</div>
          ) : (
            <LessonAssignment
              lesson={lesson}
              submission={submission}
              submitting={submitting}
              onSubmit={(content, file) =>
                void handleAssignmentSubmit(content, file)
              }
            />
          )
        )}
      </div>

      <div className="mb-6">
        <LessonAttachments files={attachments} loading={attachmentsLoading} />
      </div>

      {(lesson.lesson_type === "text" || lesson.lesson_type === "video") && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleMarkComplete()}
            disabled={submitting}
            className={markCompleteCn}
          >
            {submitting ? t("lessonPage.marking") : t("lessonPage.markComplete")}
          </button>
        </div>
      )}
    </div>
  );
};
