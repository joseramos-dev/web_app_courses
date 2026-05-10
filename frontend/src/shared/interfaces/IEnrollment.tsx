export type EnrollmentStatus = "in_progress" | "completed" | "dropped";

export type LessonProgressStatus =
    | "not_started"
    | "in_progress"
    | "completed";

export interface ILessonProgress {
    id: number;
    enrollment_id: number;
    lesson_id: number;
    status: LessonProgressStatus;
    started_at: string | null;
    completed_at: string | null;
    last_activity_at: string | null;
    watched_seconds: number;
    best_score: number | null;
    attempts: number;
}

export interface IEnrollment {
    id: number;
    user_id: number;
    course_id: number;
    status: EnrollmentStatus;
    enrolled_at: string;
    started_at: string | null;
    completed_at: string | null;
    last_activity_at: string | null;
    progress_percent: number;
    completed_lessons_count: number;
}

export interface IEnrollmentDetail extends IEnrollment {
    lesson_progress: ILessonProgress[];
}
