import type { EnrollmentStatus, LessonProgressStatus } from "./IEnrollment";
import type {
    IEnrollmentCohort,
    ILessonAggregate,
    IProgressBucket,
} from "./IDashboard";
import type { LessonType } from "../../features/course_edit/lessonTypes";

export interface IInstructorStudentRow {
    user_id: number;
    student_name: string;
    status: EnrollmentStatus;
    progress_percent: number;
    completed_lessons_count: number;
    total_lessons: number;
    enrolled_at: string;
    last_activity_at: string | null;
    completed_at: string | null;
}

export interface IInstructorCourseStudents {
    course_id: number;
    course_title: string;
    total_lessons: number;
    students_count: number;
    completed_count: number;
    avg_progress_percent: number;
    completion_rate: number;
    avg_rating: number | null;
    lesson_stats: ILessonAggregate[];
    progress_buckets: IProgressBucket[];
    cohorts: IEnrollmentCohort[];
    students: IInstructorStudentRow[];
}

export interface IInstructorLessonProgressRow {
    lesson_id: number;
    lesson_title: string;
    lesson_type: LessonType;
    position: number;
    status: LessonProgressStatus;
    best_score: number | null;
    attempts: number;
    completed_at: string | null;
    last_activity_at: string | null;
}

export interface IInstructorStudentDetail {
    student: IInstructorStudentRow;
    lesson_progress: IInstructorLessonProgressRow[];
}
