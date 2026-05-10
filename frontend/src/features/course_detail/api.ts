import axios from "axios";
import { api } from "../../shared/api/api";
import type { ICourses } from "../../shared/interfaces/ICourses";
import type { IEnrollment, IEnrollmentDetail } from "../../shared/interfaces/IEnrollment";
import type { ILesson } from "../course_edit/lessonTypes";

export const API_getCourseDetailById = async (course_Id: number): Promise<ICourses> => {
    try {
        const { data } = await api.get<ICourses>(`/courses/${course_Id}`);
        return data;
    } catch (error) {
        console.error("Error fetching course detail: ", error);
        throw error;
    }
};

export const API_getCourseLessons = async (courseId: number): Promise<ILesson[]> => {
    const { data } = await api.get<ILesson[]>(`/courses/${courseId}/lessons`);
    return data;
};

/**
 * Returns the current user's enrollment for the given course, or null if
 * the user is not enrolled (404). Any other error bubbles up.
 */
export const API_getMyEnrollment = async (
    courseId: number,
): Promise<IEnrollmentDetail | null> => {
    try {
        const { data } = await api.get<IEnrollmentDetail>(
            `/enrollments/me/course/${courseId}`,
        );
        return data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
};

export const API_enrollInCourse = async (
    courseId: number,
): Promise<IEnrollment> => {
    const { data } = await api.post<IEnrollment>(`/enrollments/${courseId}`);
    return data;
};

/** Complete enrollment at 100% when the course has no lessons (student only). */
export const API_completeEnrollmentWithoutLessons = async (
    courseId: number,
): Promise<IEnrollmentDetail> => {
    const { data } = await api.post<IEnrollmentDetail>(
        `/enrollments/me/course/${courseId}/complete-without-lessons`,
    );
    return data;
};

export interface ICourseRatingRow {
    id: number;
    user_id: number;
    course_id: number;
    score: number;
    created_at: string;
    updated_at: string;
}

export const API_putCourseRating = async (
    courseId: number,
    score: number,
): Promise<ICourseRatingRow> => {
    const { data } = await api.put<ICourseRatingRow>(
        `/courses/${courseId}/rating`,
        { score },
    );
    return data;
};

/** Current user's rating, or null if none / 404. */
export const API_getMyCourseRating = async (
    courseId: number,
): Promise<ICourseRatingRow | null> => {
    try {
        const { data } = await api.get<ICourseRatingRow>(
            `/courses/${courseId}/rating/me`,
        );
        return data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
};
