import axios from "axios";
import { api } from "../../shared/api/api";
import type {
    ICourseSubmissionsList,
    IGradeSubmissionPayload,
    ISubmission,
    ISubmissionSubmitPayload,
} from "../../shared/interfaces/ISubmission";
import { API_uploadLessonSubmissionFile } from "../course_edit/api";

type WireSubmission = {
    id: number;
    enrollment_id: number;
    lesson_id: number;
    body?: string | null;
    file_id?: number | null;
    status: ISubmission["status"];
    score?: number | null;
    feedback?: string | null;
    submitted_at: string;
    graded_at?: string | null;
    graded_by?: number | null;
};

type WireInstructorRow = {
    id: number;
    lesson_id: number;
    lesson_title: string;
    student_user_id: number;
    student_name: string;
    body?: string | null;
    file_id?: number | null;
    status: ISubmission["status"];
    score?: number | null;
    feedback?: string | null;
    submitted_at: string;
    graded_at?: string | null;
};

function mapSubmission(row: WireSubmission | WireInstructorRow): ISubmission {
    const instructorRow = row as WireInstructorRow;
    return {
        id: row.id,
        lesson_id: row.lesson_id,
        enrollment_id: "enrollment_id" in row ? row.enrollment_id : undefined,
        user_id: instructorRow.student_user_id,
        student_name: instructorRow.student_name,
        lesson_title: instructorRow.lesson_title,
        content: row.body ?? "",
        file_id: row.file_id ?? null,
        status: row.status,
        score: row.score ?? null,
        feedback: row.feedback ?? null,
        submitted_at: row.submitted_at,
        graded_at: row.graded_at ?? null,
    };
}

export async function API_getLessonSubmission(
    lessonId: number,
): Promise<ISubmission | null> {
    try {
        const { data } = await api.get<WireSubmission>(
            `/progress/lesson/${lessonId}/submission`,
        );
        return mapSubmission(data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}

export async function API_submitLessonAssignment(
    lessonId: number,
    payload: ISubmissionSubmitPayload,
): Promise<ISubmission> {
    let fileId: number | undefined;
    let fileName: string | undefined;
    if (payload.file) {
        const uploaded = await API_uploadLessonSubmissionFile(
            lessonId,
            payload.file,
        );
        fileId = uploaded.id;
        fileName = uploaded.original_filename;
    }
    const { data } = await api.post<WireSubmission>(
        `/progress/lesson/${lessonId}/submit`,
        {
            body: payload.content,
            file_id: fileId ?? null,
        },
    );
    const submission = mapSubmission(data);
    return fileName ? { ...submission, file_name: fileName } : submission;
}

export async function API_getCourseSubmissions(
    courseId: number,
): Promise<ICourseSubmissionsList> {
    const { data } = await api.get<{ submissions: WireInstructorRow[] }>(
        `/courses/${courseId}/submissions`,
    );
    const submissions = data.submissions.map(mapSubmission);
    return {
        submissions,
        pending_count: submissions.filter((s) => s.status === "pending").length,
    };
}

export async function API_gradeSubmission(
    courseId: number,
    submissionId: number,
    payload: IGradeSubmissionPayload,
): Promise<ISubmission> {
    const { data } = await api.patch<{ submission: WireSubmission }>(
        `/courses/${courseId}/submissions/${submissionId}/grade`,
        {
            score: payload.action === "grade" ? payload.score ?? 0 : 0,
            feedback: payload.feedback,
            returned: payload.action === "return",
        },
    );
    return mapSubmission(data.submission);
}
