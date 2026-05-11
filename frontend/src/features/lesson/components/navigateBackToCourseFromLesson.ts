import type { NavigateFunction } from "react-router-dom";
import { lessonChainState } from "../../../shared/types/CourseNavState";

export function navigateBackToCourseFromLesson(
  navigate: NavigateFunction,
  courseId: number,
  locationState: unknown,
): void {
  navigate(`/course/${courseId}`, {
    replace: true,
    state: lessonChainState(locationState),
  });
}
