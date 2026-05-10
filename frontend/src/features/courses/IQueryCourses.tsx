import type { ICourses } from "../../shared/interfaces/ICourses";

export interface IPaginatedCourses {
    courses: ICourses[];
    total: number;
    limit: number;
    offset: number;
}