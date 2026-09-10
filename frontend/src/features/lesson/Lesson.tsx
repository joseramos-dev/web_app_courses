import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, List } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLessonTypeLabels } from "../../shared/types/LessonTypes";
import {
  API_completeLesson,
  API_getCourseCurriculumForPlayer,
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
import { lessonErrorNoticePanelClassName } from "./components/lessonErrorNoticePanelClassName";
import { lessonMarkCompleteButtonClassName } from "./components/lessonMarkCompleteButtonClassName";
import { lessonMutedNoticePanelClassName } from "./components/lessonMutedNoticePanelClassName";
import { navigateBackToCourseFromLesson } from "./components/navigateBackToCourseFromLesson";
import { runWithSubmitting } from "./components/runWithSubmitting";
import { tryNavigateAwayOnLessonHttpError } from "./components/tryNavigateAwayOnLessonHttpError";
import type { ILesson, ILessonFile, IQuestionPublic, ICourseCurriculum } from "../course_edit/lessonTypes";
import { API_getLessonFiles } from "../course_edit/api";
import {
  KURSA_COURSE_ENROLLMENT_CHANGED_EVENT,
  KURSA_DASHBOARD_REFRESH_EVENT,
} from "../../shared/constants/appEvents";
import { lessonChainState } from "../../shared/types/CourseNavState";
import { API_getLessonAttempts } from "../progress/api";
import {
  API_getLessonSubmission,
  API_submitLessonAssignment,
} from "../progress/submissionApi";
import type { ILessonAttemptList } from "../../shared/interfaces/IProgress";
import type { ISubmission } from "../../shared/interfaces/ISubmission";
import { LessonAttemptHistory } from "./components/LessonAttemptHistory";
import { LessonNavButtons, LessonSidebar } from "./components/LessonSidebar";
import { useAuth } from "../../shared/provider/AuthContext";
import { API_getCourseDetailById, API_getMyEnrollment } from "../course_detail/api";
import type { ICourses } from "../../shared/interfaces/ICourses";
import type { IEnrollmentDetail } from "../../shared/interfaces/IEnrollment";
import { getLessonGlobalIndex } from "../../shared/utils/curriculumUtils";
import { isCourseStaff, isLessonUnlocked } from "../../shared/utils/lessonAccessUtils";
import { buildLessonProgressMap } from "../../shared/utils/buildLessonProgressMap";
import { useAsyncData } from "../../shared/hooks/useAsyncData";

export const Lesson = () => {
  const { t } = useTranslation();
  const lessonTypeLabels = getLessonTypeLabels(t);
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [lesson, setLesson] = useState<ILesson | null>(null);
  const [siblings, setSiblings] = useState<ILesson[]>([]);
  const [curriculum, setCurriculum] = useState<ICourseCurriculum | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [questions, setQuestions] = useState<IQuestionPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [course, setCourse] = useState<ICourses | null>(null);
  const [enrollment, setEnrollment] = useState<IEnrollmentDetail | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const courseIdNum = Number(courseId);
  const lessonIdNum = Number(lessonId);

  const isAutoCompleteType =
    lesson?.lesson_type === "test" ||
    lesson?.lesson_type === "multiple_selection";
  const isAssignmentType = lesson?.lesson_type === "assignment";

  const {
    data: attemptHistory,
    loading: attemptsLoading,
    refetch: refetchAttemptHistory,
  } = useAsyncData<ILessonAttemptList | null>(
    () =>
      isAutoCompleteType
        ? API_getLessonAttempts(lessonIdNum)
        : Promise.resolve(null),
    [lessonIdNum, isAutoCompleteType],
  );

  const {
    data: submission,
    loading: submissionLoading,
    setData: setSubmission,
  } = useAsyncData<ISubmission | null>(
    () =>
      isAssignmentType
        ? API_getLessonSubmission(lessonIdNum)
        : Promise.resolve(null),
    [lessonIdNum, isAssignmentType],
  );

  const { data: attachmentsData, loading: attachmentsLoading } = useAsyncData<ILessonFile[]>(
    () => API_getLessonFiles(lessonIdNum),
    [lessonIdNum],
  );
  const attachments = attachmentsData ?? [];

  const mutedPanelCn = lessonMutedNoticePanelClassName();
  const errorPanelCn = lessonErrorNoticePanelClassName();
  const markCompleteCn = lessonMarkCompleteButtonClassName();

  const lessonNavState = lessonChainState(location.state);

  const globalIndex = useMemo(() => {
    if (!lesson) return 0;
    return getLessonGlobalIndex(siblings, lesson.id);
  }, [lesson, siblings]);

  const prevLessonId = useMemo(() => {
    if (!lesson || siblings.length === 0) return null;
    const idx = siblings.findIndex((l) => l.id === lesson.id);
    if (idx <= 0) return null;
    return siblings[idx - 1].id;
  }, [lesson, siblings]);

  const nextLessonId = useMemo(() => {
    if (!lesson || siblings.length === 0) return null;
    const idx = siblings.findIndex((l) => l.id === lesson.id);
    if (idx === -1 || idx >= siblings.length - 1) return null;
    return siblings[idx + 1].id;
  }, [lesson, siblings]);

  const isStaff = isCourseStaff(user, course);

  const prevUnlocked =
    prevLessonId == null ||
    isLessonUnlocked(course, enrollment, prevLessonId, isStaff);
  const nextUnlocked =
    nextLessonId == null ||
    isLessonUnlocked(course, enrollment, nextLessonId, isStaff);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      if (Number.isNaN(courseIdNum) || Number.isNaN(lessonIdNum)) {
        setError(t("lessonPage.invalidLesson"));
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        setIsCompleted(false);

        const lessonReq = API_getLesson(lessonIdNum);
        const navReq = API_getCourseLessonsForNav(courseIdNum);
        const curriculumReq = API_getCourseCurriculumForPlayer(courseIdNum);
        const courseReq = API_getCourseDetailById(courseIdNum);
        const enrollmentReq =
          user?.role === "student"
            ? API_getMyEnrollment(courseIdNum).catch(() => null)
            : Promise.resolve(null);
        const startReq = API_startLesson(lessonIdNum);
        const [lessonData, navData, curriculumData, courseData, enrollmentData] =
          await Promise.all([
            lessonReq,
            navReq,
            curriculumReq,
            courseReq,
            enrollmentReq,
          ]);
        if (cancelled) return;
        setLesson(lessonData);
        setSiblings(navData);
        setCurriculum(curriculumData);
        setCourse(courseData);
        setEnrollment(enrollmentData);
        setIsCompleted(
          buildLessonProgressMap(enrollmentData).get(lessonIdNum) === "completed",
        );

        let progressBestScore: number | null = null;
        try {
          const progress = await startReq;
          progressBestScore = progress.best_score ?? null;
        } catch (e) {
          if (cancelled) return;
          const handled = tryNavigateAwayOnLessonHttpError({
            error: e,
            navigate,
            courseId: courseIdNum,
            locationState: location.state,
            t,
            treatForbiddenOrNotFoundAsEnrollment: true,
          });
          if (handled) return;
          // The lesson itself already loaded fine; a transient failure
          // marking it as "started" shouldn't block the student from
          // viewing it (retrying will register the progress anyway).
          console.error("No se pudo registrar el inicio de la lección:", e);
          toast.error(t("lessonPage.progressUpdateFailed"));
        }
        if (cancelled) return;

        if (
          lessonData.lesson_type === "test" ||
          lessonData.lesson_type === "multiple_selection"
        ) {
          const qs = await API_getLessonQuestions(lessonIdNum);
          if (cancelled) return;
          setQuestions(qs);
          if (progressBestScore != null) {
            setLastScore(progressBestScore);
          }
        }
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        const handled = tryNavigateAwayOnLessonHttpError({
          error: e,
          navigate,
          courseId: courseIdNum,
          locationState: location.state,
          t,
        });
        if (handled) return;
        setError(t("lessonPage.loadFailed"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [courseIdNum, lessonIdNum, navigate, t, user, location.state]);

  const handleAfterPass = async (enrollmentCompleted: boolean) => {
    setIsCompleted(true);
    window.dispatchEvent(new Event(KURSA_DASHBOARD_REFRESH_EVENT));
    window.dispatchEvent(
      new CustomEvent(KURSA_COURSE_ENROLLMENT_CHANGED_EVENT, {
        detail: { courseId: courseIdNum },
      }),
    );
    if (enrollmentCompleted) {
      toast.success(t("lessonPage.courseCompleted"));
    } else {
      toast.success(t("lessonPage.passed"));
    }
    if (user?.role === "student") {
      try {
        const freshEnrollment = await API_getMyEnrollment(courseIdNum);
        setEnrollment(freshEnrollment);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleMarkComplete = async () => {
    if (!lesson) return;
    const result = await runWithSubmitting(
      setSubmitting,
      () => API_completeLesson(lesson.id),
      t("lessonPage.markCompleteFailed"),
    );
    if (result) await handleAfterPass(result.enrollment_completed);
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
      await refetchAttemptHistory();
      return;
    }
    await refetchAttemptHistory();
    await handleAfterPass(result.enrollment_completed);
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface">
        <div className={mutedPanelCn}>{t("lessonPage.loading")}</div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface">
        <div className={errorPanelCn}>{error ?? t("lessonPage.notFound")}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-900">
        <button
          type="button"
          onClick={() =>
            navigateBackToCourseFromLesson(navigate, courseIdNum, location.state)
          }
          className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-slate-200"
        >
          <ArrowLeft className="size-4" />
          {t("lessonPage.backToCourse")}
        </button>
        <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
          {t("lessonPage.indexOfTotal", {
            current: globalIndex,
            total: siblings.length,
          })}
        </span>
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm lg:hidden"
        >
          <List className="size-4" />
          {t("lessonPage.sidebar.open")}
        </button>
        <div className="hidden w-16 lg:block" />
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">
              {lessonTypeLabels[lesson.lesson_type]}
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {lesson.title}
            </h1>

            <div className="mt-6 mb-6">
              {lesson.lesson_type === "text" && <LessonText body={lesson.body} />}
              {lesson.lesson_type === "video" && (
                <LessonVideo videoUrl={lesson.video_url} />
              )}
              {(lesson.lesson_type === "test" ||
                lesson.lesson_type === "multiple_selection") && (
                <>
                  {lesson.passing_score != null ? (
                    <p className="mb-4 text-sm text-gray-600 dark:text-slate-400">
                      {t("lessonPage.passingScoreNote", {
                        score: Math.round(lesson.passing_score),
                      })}
                    </p>
                  ) : null}
                  <LessonQuiz
                    questions={questions}
                    mode={lesson.lesson_type === "test" ? "single" : "multiple"}
                    submitting={submitting}
                    onSubmit={handleQuizSubmit}
                    lastScore={lastScore}
                    completed={isCompleted}
                  />
                  <section className="mt-6 rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {t("lessonPage.attemptHistory.title")}
                    </h2>
                    <div className="mt-3">
                      <LessonAttemptHistory
                        data={attemptHistory}
                        loading={attemptsLoading}
                      />
                    </div>
                  </section>
                </>
              )}
              {lesson.lesson_type === "assignment" &&
                (submissionLoading ? (
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
                ))}
            </div>

            <LessonAttachments files={attachments} loading={attachmentsLoading} />

            {!isAutoCompleteType && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleMarkComplete()}
                  disabled={submitting || isCompleted}
                  className={markCompleteCn}
                >
                  {isCompleted
                    ? t("lessonPage.lessonCompleted")
                    : submitting
                      ? t("lessonPage.marking")
                      : t("lessonPage.markComplete")}
                </button>
              </div>
            )}

            <LessonNavButtons
              courseId={courseIdNum}
              prevId={prevLessonId}
              nextId={nextLessonId}
              navState={lessonNavState}
              prevUnlocked={prevUnlocked}
              nextUnlocked={nextUnlocked}
            />
          </div>
        </div>

        {curriculum ? (
          <LessonSidebar
            courseId={courseIdNum}
            currentLessonId={lesson.id}
            curriculum={curriculum}
            course={course}
            enrollment={enrollment}
            isStaff={isStaff}
            open={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
            navState={lessonNavState}
          />
        ) : null}
      </div>
    </div>
  );
};
