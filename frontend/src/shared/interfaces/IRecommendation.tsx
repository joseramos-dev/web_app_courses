import type { ICourses } from "./ICourses";
import type {
    CategoryTypes,
    CourseTypeTypes,
    DifficultyTypes,
    DurationBucketTypes,
    LanguageTypes,
    SiteTypes,
} from "../types/CourseTypes";

export type RecommendationSourceType = "preferences" | "collaborative" | "history" | "hybrid";

export interface ICourseRecommendation {
    course: ICourses;
    recommendation_percent: number;
    source_type: RecommendationSourceType;
}

export interface IListCourseRecommendations {
    recommendations: ICourseRecommendation[];
}

export interface IRecommendationPreferences {
    user_id: number;
    preferred_sites: SiteTypes[];
    preferred_categories: CategoryTypes[];
    preferred_languages: LanguageTypes[];
    preferred_course_types: CourseTypeTypes[];
    preferred_duration_buckets: DurationBucketTypes[];
    preferred_difficulties: DifficultyTypes[];
}

export type IRecommendationPreferencesUpdate = {
    preferred_sites?: SiteTypes[];
    preferred_categories?: CategoryTypes[];
    preferred_languages?: LanguageTypes[];
    preferred_course_types?: CourseTypeTypes[];
    preferred_duration_buckets?: DurationBucketTypes[];
    preferred_difficulties?: DifficultyTypes[];
};
