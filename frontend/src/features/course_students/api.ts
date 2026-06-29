import { api } from "../../shared/api/api";
import type {
    IInstructorCourseStudents,
    IInstructorStudentDetail,
} from "../../shared/interfaces/IInstructorCourseStudents";

export async function API_getCourseStudents(courseId: number) {
    const { data } = await api.get<IInstructorCourseStudents>(
        `/courses/${courseId}/instructor/enrollments`,
    );
    return data;
}

export async function API_getStudentDetail(courseId: number, userId: number) {
    const { data } = await api.get<IInstructorStudentDetail>(
        `/courses/${courseId}/instructor/enrollments/${userId}`,
    );
    return data;
}
