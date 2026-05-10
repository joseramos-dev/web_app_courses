import { apiArray } from "../../shared/api/api";
import type { IPaginatedCourses } from "./IQueryCourses";
import type { CategoryTypes, CourseTypeTypes, LanguageTypes, SiteTypes } from "../../shared/types/CourseTypes";
import {
    sortByToApiParam,
    type sort_by_api_types,
    type sort_by_dir,
    type sort_by_types,
} from "../../shared/types/SortTypes";


export const get_courses = async (
    params: {
        search?: string;
        limit?: number;
        offset?: number;
        site?: SiteTypes[];
        category?: CategoryTypes[];
        language?: LanguageTypes[];
        course_type?: CourseTypeTypes[];
        sort_by?: sort_by_types;
        order?: sort_by_dir;
    }
): Promise<IPaginatedCourses> => {
    try {
        const { sort_by: sortUi, ...rest } = params;
        const query: typeof rest & { sort_by?: sort_by_api_types } = { ...rest };
        if (sortUi !== undefined) {
            query.sort_by = sortByToApiParam(sortUi);
        }
        const {data} = await apiArray.get<IPaginatedCourses>('/courses', {
            params: query,
        });
        console.log(params)
        return data;
    } catch (error) {
        console.error("Error fetching courses:", error);
        throw error;
    }
}
