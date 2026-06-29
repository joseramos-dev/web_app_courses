import type { CategoryTypes, CourseTypeTypes, DifficultyTypes, DurationBucketTypes, LanguageTypes, SiteTypes } from "../types/CourseTypes";

export interface ICourses {
    id: number;
    title: string;
    url: string;
    site: SiteTypes;
    category: CategoryTypes;
    language: LanguageTypes;
    course_type: CourseTypeTypes;
    subcategory: string | null;
    intro: string | null;
    rating: number | null;
    ratings_count: number;
    duration_seconds: number | null;
    duration_bucket?: DurationBucketTypes | null;
    difficulty: DifficultyTypes;
    created_at: string;
    updated_at: string;
    instructor_id: number | null;
    instructor_name: string | null;
    lessons_count: number;
}