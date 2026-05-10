import type { CategoryTypes } from "../types/CourseTypes";
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
    last_activity_at: string | null;
}

export interface IInstructorDashboard {
    courses_count: number;
    total_students: number;
    avg_progress_percent: number;
    completed_students: number;
    courses: IInstructorCourseRow[];
    top_active_students: ITopStudent[];
    top_completed_lessons: ITopLesson[];
}

// ---------- Admin ----------

export interface IAdminDashboard {
    students_count: number;
    courses_count: number;
    active_enrollments_count: number;
    total_lessons_completed: number;
    top_courses: ITopCourse[];
    top_active_students: ITopStudent[];
    category_distribution: ICategoryStat[];
    last_30_days: IDailyActivity[];
}
