import type { LessonType } from "../../features/course_edit/lessonTypes";

/** `t` is the i18next translate function (from `useTranslation()`). */
export function getLessonTypeLabels(
    t: (key: string) => string,
): Record<LessonType, string> {
    return {
        text: t("domain.lessonType.text"),
        video: t("domain.lessonType.video"),
        test: t("domain.lessonType.test"),
        multiple_selection: t("domain.lessonType.multiple_selection"),
        assignment: t("domain.lessonType.assignment"),
    };
}

export type PublicStatsPeriod = "day" | "week" | "month";

export function getPublicStatsPeriodLabels(
    t: (key: string) => string,
): Record<PublicStatsPeriod, string> {
    return {
        day: t("domain.statsPeriod.day"),
        week: t("domain.statsPeriod.week"),
        month: t("domain.statsPeriod.month"),
    };
}
