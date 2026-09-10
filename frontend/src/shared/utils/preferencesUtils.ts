import type { IRecommendationPreferencesUpdate } from "../interfaces/IRecommendation";

/**
 * Whether the user has picked at least one preference.
 *
 * Mirrors `has_any_preferences` in the backend recommender
 * (`modules/recommendations/aux_content_based.py`): with all six lists empty
 * and no course history there is nothing to recommend from, so this doubles as
 * the trigger for the onboarding modal.
 */
export function hasAnyPreference(
    prefs: IRecommendationPreferencesUpdate,
): boolean {
    return (
        (prefs.preferred_sites?.length ?? 0) > 0 ||
        (prefs.preferred_categories?.length ?? 0) > 0 ||
        (prefs.preferred_languages?.length ?? 0) > 0 ||
        (prefs.preferred_course_types?.length ?? 0) > 0 ||
        (prefs.preferred_duration_buckets?.length ?? 0) > 0 ||
        (prefs.preferred_difficulties?.length ?? 0) > 0
    );
}

export const EMPTY_PREFERENCES: IRecommendationPreferencesUpdate = {
    preferred_sites: [],
    preferred_categories: [],
    preferred_languages: [],
    preferred_course_types: [],
    preferred_duration_buckets: [],
    preferred_difficulties: [],
};
