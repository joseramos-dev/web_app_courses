import { api } from "../../shared/api/api";
import type { ILesson, IQuestionPublic } from "../course_edit/lessonTypes";
import type { ILessonProgress } from "../../shared/interfaces/IEnrollment";

export interface ILessonAnswer {
    question_id: number;
    selected_option_ids: number[];
}

export interface ILessonCompleteResult {
    passed: boolean;
    score: number | null;
    lesson_progress: ILessonProgress;
    enrollment_progress_percent: number;
    enrollment_completed: boolean;
}

export const API_getLesson = async (lessonId: number): Promise<ILesson> => {
    const { data } = await api.get<ILesson>(`/lessons/${lessonId}`);
    return data;
};

export const API_getLessonQuestions = async (
    lessonId: number,
): Promise<IQuestionPublic[]> => {
    const { data } = await api.get<IQuestionPublic[]>(
        `/lessons/${lessonId}/questions`,
    );
    return data;
};

export const API_startLesson = async (
    lessonId: number,
): Promise<ILessonProgress> => {
    const { data } = await api.post<ILessonProgress>(
        `/progress/lesson/${lessonId}/start`,
    );
    return data;
};

export const API_completeLesson = async (
    lessonId: number,
    answers?: ILessonAnswer[],
): Promise<ILessonCompleteResult> => {
    const { data } = await api.post<ILessonCompleteResult>(
        `/progress/lesson/${lessonId}/complete`,
        answers ? { answers } : {},
    );
    return data;
};

export const API_getCourseLessonsForNav = async (
    courseId: number,
): Promise<ILesson[]> => {
    const { data } = await api.get<ILesson[]>(`/courses/${courseId}/lessons`);
    return data;
};
