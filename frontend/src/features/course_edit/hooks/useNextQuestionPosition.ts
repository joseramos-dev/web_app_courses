import { useAsyncData } from "../../../shared/hooks/useAsyncData";
import { API_getLessonQuestionsAdmin } from "../api";

/** Next free position for a new question in this lesson. Falls back to 1
 *  while loading or if the questions failed to load. */
export function useNextQuestionPosition(lessonId: number): number {
    const { data: questions } = useAsyncData(
        () => API_getLessonQuestionsAdmin(lessonId),
        [lessonId],
    );
    if (!questions || questions.length === 0) return 1;
    return Math.max(...questions.map((q) => q.position)) + 1;
}
