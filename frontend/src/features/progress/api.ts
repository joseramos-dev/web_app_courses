import { api } from "../../shared/api/api";
import type {
    ILessonAttemptList,
    IStudentPerformance,
} from "../../shared/interfaces/IProgress";

export const API_getLessonAttempts = async (
    lessonId: number,
): Promise<ILessonAttemptList> => {
    const { data } = await api.get<ILessonAttemptList>(
        `/progress/lesson/${lessonId}/attempts`,
    );
    return data;
};

export const API_getStudentPerformance = async (): Promise<IStudentPerformance> => {
    const { data } = await api.get<IStudentPerformance>("/progress/me/performance");
    return data;
};
