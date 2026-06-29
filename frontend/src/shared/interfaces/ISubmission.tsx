export type SubmissionStatus = "pending" | "graded" | "returned";

export interface ISubmission {
    id: number;
    lesson_id: number;
    enrollment_id?: number;
    user_id?: number;
    student_name?: string | null;
    lesson_title?: string | null;
    lesson_position?: number | null;
    content: string;
    file_id?: number | null;
    file_name?: string | null;
    status: SubmissionStatus;
    score: number | null;
    feedback: string | null;
    max_score?: number | null;
    submitted_at: string;
    graded_at: string | null;
}

export interface ICourseSubmissionsList {
    submissions: ISubmission[];
    pending_count: number;
}

export interface ISubmissionSubmitPayload {
    content: string;
    file?: File | null;
}

export interface IGradeSubmissionPayload {
    score?: number | null;
    feedback?: string | null;
    action: "grade" | "return";
}
