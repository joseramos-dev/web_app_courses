import type { ICourses } from "../interfaces/ICourses";
import type { IEnrollmentDetail } from "../interfaces/IEnrollment";
import type { IUser } from "../interfaces/IUser";

export type LessonAccessMode = "open" | "progressive";

/**
 * Whether `user` should be treated as staff (able to manage) `course`:
 * an admin, or the instructor who owns the course.
 */
export function isCourseStaff(
    user: Pick<IUser, "id" | "role"> | null | undefined,
    course: Pick<ICourses, "instructor_id"> | null | undefined,
): boolean {
    return (
        user?.role === "admin" ||
        (user?.role === "instructor" &&
            course?.instructor_id != null &&
            user.id === course.instructor_id)
    );
}

export function isLessonUnlocked(
    course: Pick<ICourses, "lesson_access_mode"> | null | undefined,
    enrollment: Pick<IEnrollmentDetail, "unlocked_lesson_ids"> | null | undefined,
    lessonId: number,
    isStaff = false,
): boolean {
    if (isStaff) return true;
    if (!enrollment) return false;
    const mode = course?.lesson_access_mode ?? "open";
    if (mode === "open") return true;
    const unlocked = enrollment.unlocked_lesson_ids ?? [];
    return unlocked.includes(lessonId);
}

export function pickFirstUnlockedLessonId(
    lessonIds: number[],
    course: Pick<ICourses, "lesson_access_mode"> | null | undefined,
    enrollment: IEnrollmentDetail | null | undefined,
    isStaff = false,
): number | null {
    for (const id of lessonIds) {
        if (isLessonUnlocked(course, enrollment, id, isStaff)) return id;
    }
    return lessonIds[0] ?? null;
}
