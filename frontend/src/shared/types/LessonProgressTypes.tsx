import type { LessonProgressStatus } from "../interfaces/IEnrollment";

export function getLessonProgressStatusLabels(
    t: (key: string) => string,
): Record<LessonProgressStatus, string> {
    return {
        not_started: t("dashboard.student.status.notStarted"),
        in_progress: t("dashboard.student.status.inProgress"),
        completed: t("dashboard.student.status.completed"),
    };
}

export const lessonProgressStatusBadgeClassName: Record<LessonProgressStatus, string> = {
    not_started: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200",
};
