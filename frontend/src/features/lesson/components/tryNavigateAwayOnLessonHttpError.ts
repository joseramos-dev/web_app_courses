import axios from "axios";
import toast from "react-hot-toast";
import type { NavigateFunction } from "react-router-dom";
import { lessonChainState } from "../../../shared/types/CourseNavState";

export function tryNavigateAwayOnLessonHttpError(options: {
  error: unknown;
  navigate: NavigateFunction;
  courseId: number;
  locationState: unknown;
  /** When true, 403/404 show enrollment message (start-lesson guard). */
  treatForbiddenOrNotFoundAsEnrollment?: boolean;
}): boolean {
  const {
    error,
    navigate,
    courseId,
    locationState,
    treatForbiddenOrNotFoundAsEnrollment,
  } = options;

  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;

  if (treatForbiddenOrNotFoundAsEnrollment) {
    if (status === 403 || status === 404) {
      toast.error("Necesitas matricularte para acceder a esta lección.");
      navigate(`/course/${courseId}`, {
        state: lessonChainState(locationState),
      });
      return true;
    }
    return false;
  }

  if (status === 403) {
    toast.error("No puedes acceder a esta lección.");
    navigate(`/course/${courseId}`, {
      state: lessonChainState(locationState),
    });
    return true;
  }

  return false;
}
