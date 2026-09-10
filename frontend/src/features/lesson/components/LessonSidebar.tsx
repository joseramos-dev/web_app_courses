import { Lock } from "lucide-react";
import { ChevronLeft, ChevronRight, List, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ICourseCurriculum } from "../../course_edit/lessonTypes";
import type { CourseNavState } from "../../../shared/types/CourseNavState";
import type { ICourses } from "../../../shared/interfaces/ICourses";
import type { IEnrollmentDetail } from "../../../shared/interfaces/IEnrollment";
import { isLessonUnlocked } from "../../../shared/utils/lessonAccessUtils";

type Props = {
  courseId: number;
  currentLessonId: number;
  curriculum: ICourseCurriculum;
  course?: ICourses | null;
  enrollment?: IEnrollmentDetail | null;
  isStaff?: boolean;
  open: boolean;
  onToggle: () => void;
  navState: CourseNavState;
};

export function LessonSidebar({
  courseId,
  currentLessonId,
  curriculum,
  course = null,
  enrollment = null,
  isStaff = false,
  open,
  onToggle,
  navState,
}: Props) {
  const { t } = useTranslation();
  let globalIndex = 0;

  const body = (
    <div className="space-y-3">
      {[...curriculum.topics]
        .sort((a, b) => a.position - b.position)
        .map((topic) => {
          const isCurrentTopic = topic.lessons.some((l) => l.id === currentLessonId);
          return (
            <details key={topic.id} open={isCurrentTopic} className="rounded-lg border dark:border-slate-600">
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-gray-800 dark:text-slate-100">
                {topic.name}
              </summary>
              <ul className="space-y-1 px-2 pb-2">
                {[...topic.lessons]
                  .sort((a, b) => a.position - b.position)
                  .map((lesson) => {
                    globalIndex += 1;
                    const active = lesson.id === currentLessonId;
                    const unlocked = isLessonUnlocked(course, enrollment, lesson.id, isStaff);
                    const locked = !isStaff && enrollment != null && !unlocked;

                    if (locked) {
                      return (
                        <li key={lesson.id}>
                          <div
                            title={t("courseDetail.lessonLockedHint")}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm opacity-60"
                          >
                            <Lock className="size-3.5 shrink-0 text-gray-400" />
                            <span className="truncate text-gray-500 dark:text-slate-500">
                              {globalIndex}. {lesson.title}
                            </span>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li key={lesson.id}>
                        <Link
                          to={`/course/${courseId}/lesson/${lesson.id}`}
                          state={navState}
                          className={`block rounded px-2 py-1.5 text-sm ${
                            active
                              ? "bg-green-100 font-semibold text-green-900 dark:bg-uned-primary/20 dark:text-uned-primary"
                              : "text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
                          }`}
                        >
                          {globalIndex}. {lesson.title}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </details>
          );
        })}
    </div>
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-lg dark:bg-uned-primary dark:text-slate-900 lg:hidden"
      >
        <List className="size-4" />
        {t("lessonPage.sidebar.open")}
      </button>
    );
  }

  return (
    <>
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800 lg:block">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("lessonPage.sidebar.title")}</h2>
        </div>
        {body}
      </aside>

      <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onToggle} />
      <aside className="fixed inset-y-0 right-0 z-40 w-80 overflow-y-auto bg-white p-4 shadow-xl dark:bg-slate-800 lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("lessonPage.sidebar.title")}</h2>
          <button type="button" onClick={onToggle} aria-label={t("lessonPage.sidebar.close")}>
            <X className="size-5" />
          </button>
        </div>
        {body}
      </aside>
    </>
  );
}

export function LessonNavButtons({
  courseId,
  prevId,
  nextId,
  navState,
  nextUnlocked = true,
  prevUnlocked = true,
}: {
  courseId: number;
  prevId: number | null;
  nextId: number | null;
  navState: CourseNavState;
  nextUnlocked?: boolean;
  prevUnlocked?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-gray-200 pt-6 dark:border-slate-600">
      {prevId && prevUnlocked ? (
        <Link
          to={`/course/${courseId}/lesson/${prevId}`}
          state={navState}
          className="inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          <ChevronLeft className="size-4" />
          {t("lessonPage.previous")}
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-semibold opacity-40">
          <ChevronLeft className="size-4" />
          {t("lessonPage.previous")}
        </span>
      )}
      {nextId && nextUnlocked ? (
        <Link
          to={`/course/${courseId}/lesson/${nextId}`}
          state={navState}
          className="inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          {t("lessonPage.next")}
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-semibold opacity-40">
          {t("lessonPage.next")}
          <ChevronRight className="size-4" />
        </span>
      )}
    </div>
  );
}
