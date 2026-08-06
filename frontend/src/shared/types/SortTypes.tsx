/** Values stored in the URL / UI (select). */
export type sort_by_types =
    | "title"
    | "rating"
    | "duration_seconds"
    | "time_creation"

/** Values accepted by GET /courses `sort_by` (backend SortField). */
export type sort_by_api_types =
    | "title"
    | "rating"
    | "duration_seconds"
    | "created_at"

export type sort_by_dir =
    | "asc"
    | "desc"

export const SORT_BY_KEYS: sort_by_types[] = [
    "title",
    "rating",
    "duration_seconds",
    "time_creation",
];

/** `t` is the i18next translate function (from `useTranslation()`). */
export function getSortByOptions(
    t: (key: string) => string,
): Record<sort_by_types, string> {
    return {
        title: t("domain.sortBy.title"),
        rating: t("domain.sortBy.rating"),
        duration_seconds: t("domain.sortBy.duration_seconds"),
        time_creation: t("domain.sortBy.time_creation"),
    };
}

export function getSortByEntries(
    t: (key: string) => string,
): [sort_by_types, string][] {
    return Object.entries(getSortByOptions(t)) as [sort_by_types, string][];
}

/** Map UI/url sort key to the query param the API expects. */
export function sortByToApiParam(value: sort_by_types): sort_by_api_types {
    if (value === "time_creation") return "created_at"
    return value
}
