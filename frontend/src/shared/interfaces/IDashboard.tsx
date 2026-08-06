import type { CategoryTypes, DifficultyTypes, SiteTypes } from "../types/CourseTypes";
import type { LessonProgressStatus } from "./IEnrollment";

export interface IDailyActivity {
    date: string; // ISO yyyy-mm-dd
    lessons_started: number;
    lessons_completed: number;
}

export interface ITopStudent {
    user_id: number;
    name: string;
    lessons_completed_in_window: number;
}

export interface ITopLesson {
    lesson_id: number;
    lesson_title: string;
    course_id: number;
    course_title: string;
    completed_count: number;
}

export interface ITopCourse {
    course_id: number;
    course_title: string;
    enrollments_count: number;
}

export interface ICategoryStat {
    category: CategoryTypes;
    enrollments_count: number;
}

export interface ISiteStat {
    site: SiteTypes;
    enrollments_count: number;
}

export interface IDifficultyStat {
    difficulty: DifficultyTypes;
    enrollments_count: number;
}

export interface IEnrollmentCohort {
    cohort_month: string;
    enrollments_count: number;
    avg_progress_percent: number;
    completion_rate: number;
}

export interface IProgressBucket {
    label: string;
    count: number;
}

export interface ILessonAggregate {
    lesson_id: number;
    lesson_title: string;
    position: number;
    completed_count: number;
    completion_rate: number;
    avg_best_score: number | null;
}

// ---------- Student ----------

export interface IRecentCourse {
    course_id: number;
    course_title: string;
    progress_percent: number;
    completed_lessons_count: number;
    total_lessons: number;
    last_activity_at: string | null;
    next_lesson_id: number | null;
}

export interface ICompletedCourseRow {
    course_id: number;
    course_title: string;
    completed_at: string | null;
}

export interface IRecentLesson {
    lesson_id: number;
    lesson_title: string;
    course_id: number;
    course_title: string;
    status: LessonProgressStatus;
    last_activity_at: string | null;
    completed_at: string | null;
}

export interface IStudentDashboard {
    in_progress_count: number;
    completed_count: number;
    total_lessons_completed: number;
    streak_days: number;
    last_7_days: IDailyActivity[];
    recent_courses: IRecentCourse[];
    completed_courses: ICompletedCourseRow[];
    recent_lessons: IRecentLesson[];
}

// ---------- Instructor ----------

export interface IInstructorCourseRow {
    course_id: number;
    course_title: string;
    students_count: number;
    avg_progress_percent: number;
    completed_students: number;
    completion_rate: number;
    avg_rating: number | null;
    last_activity_at: string | null;
}

export interface IPendingSubmissionRow {
    id: number;
    course_id: number;
    course_title: string;
    lesson_id: number;
    lesson_title: string;
    student_user_id: number;
    student_name: string;
    submitted_at: string;
}

export interface IInstructorDashboard {
    courses_count: number;
    total_students: number;
    avg_progress_percent: number;
    completed_students: number;
    courses: IInstructorCourseRow[];
    top_active_students: ITopStudent[];
    top_completed_lessons: ITopLesson[];
    pending_submissions_count: number;
    pending_submissions: IPendingSubmissionRow[];
}

// ---------- Admin ----------

export interface IAdminDashboard {
    students_count: number;
    courses_count: number;
    active_enrollments_count: number;
    total_lessons_completed: number;
    total_enrollments: number;
    completion_rate: number;
    avg_course_rating: number | null;
    top_courses: ITopCourse[];
    top_active_students: ITopStudent[];
    category_distribution: ICategoryStat[];
    site_distribution: ISiteStat[];
    difficulty_distribution: IDifficultyStat[];
    enrollment_cohorts: IEnrollmentCohort[];
    last_30_days: IDailyActivity[];
}

// ---------- Public landing ----------

export interface ILessonTypeStat {
    lesson_type: string;
    completed_count: number;
}

export interface IPublicStats {
    period: "day" | "week" | "month";
    courses_count: number;
    total_enrollments: number;
    active_enrollments_count: number;
    lessons_completed_in_period: number;
    top_courses: ITopCourse[];
    category_distribution: ICategoryStat[];
    activity_series: IDailyActivity[];
    lesson_completions_by_type: ILessonTypeStat[];
}
