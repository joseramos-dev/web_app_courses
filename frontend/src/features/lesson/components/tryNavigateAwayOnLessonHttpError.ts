import axios from "axios";
import toast from "react-hot-toast";
import type { NavigateFunction } from "react-router-dom";
import type { TFunction } from "i18next";
import { lessonChainState } from "../../../shared/types/CourseNavState";

function isLessonLockedError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const code =
    error.response?.headers?.["x-error-code"] ??
    error.response?.headers?.["X-Error-Code"];
  return code === "lesson_locked";
}

export function tryNavigateAwayOnLessonHttpError(options: {
  error: unknown;
  navigate: NavigateFunction;
  courseId: number;
  locationState: unknown;
  t: TFunction;
  /** When true, 403/404 show enrollment message (start-lesson guard). */
  treatForbiddenOrNotFoundAsEnrollment?: boolean;
}): boolean {
  const {
    error,
    navigate,
    courseId,
    locationState,
    t,
    treatForbiddenOrNotFoundAsEnrollment,
  } = options;

  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;

  if (isLessonLockedError(error)) {
    toast.error(t("lessonPage.lessonLocked"));
    navigate(`/course/${courseId}`, {
      state: lessonChainState(locationState),
    });
    return true;
  }

  if (treatForbiddenOrNotFoundAsEnrollment) {
    if (status === 403 || status === 404) {
      toast.error(t("lessonPage.enrollmentRequired"));
      navigate(`/course/${courseId}`, {
        state: lessonChainState(locationState),
      });
      return true;
    }
    return false;
  }

  if (status === 403) {
    toast.error(t("lessonPage.lessonLocked"));
    navigate(`/course/${courseId}`, {
      state: lessonChainState(locationState),
    });
    return true;
  }

  return false;
}
