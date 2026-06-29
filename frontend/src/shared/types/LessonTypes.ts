import type { LessonType } from "../../features/course_edit/lessonTypes";

export const lessonTypeLabels: Record<LessonType, string> = {
    text: "Texto",
    video: "Vídeo",
    test: "Test",
    multiple_selection: "Selección múltiple",
    assignment: "Tarea",
};

export type PublicStatsPeriod = "day" | "week" | "month";

export const publicStatsPeriodLabels: Record<PublicStatsPeriod, string> = {
    day: "Día",
    week: "Semana",
    month: "Mes",
};
