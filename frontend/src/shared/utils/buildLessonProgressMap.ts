import type { IEnrollmentDetail, LessonProgressStatus } from "../interfaces/IEnrollment";

export function buildLessonProgressMap(
    enrollment: IEnrollmentDetail | null | undefined,
): Map<number, LessonProgressStatus> {
    const statusMap = new Map<number, LessonProgressStatus>();
    if (enrollment) {
        for (const lp of enrollment.lesson_progress) {
            statusMap.set(lp.lesson_id, lp.status);
        }
    }
    return statusMap;
}
