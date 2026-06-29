export interface ILessonAttempt {
    id: number;
    score: number;
    passed: boolean;
    attempted_at: string;
}

export interface ILessonAttemptList {
    attempts: ILessonAttempt[];
    best_score: number | null;
    total_attempts: number;
}

export interface IRecentAttempt {
    id: number;
    course_id: number;
    course_title: string;
    lesson_id: number;
    lesson_title: string;
    score: number;
    passed: boolean;
    attempted_at: string;
}

export interface ICoursePerformanceRow {
    course_id: number;
    course_title: string;
    user_avg_score: number | null;
    cohort_avg_score: number | null;
    total_attempts: number;
    tests_with_attempts: number;
}

export interface IStudentPerformance {
    overall_avg_score: number | null;
    total_attempts: number;
    courses: ICoursePerformanceRow[];
    recent_attempts: IRecentAttempt[];
}
