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

export const SORT_BY_OPTIONS: Record<sort_by_types, string> = {
    title: "Title",
    rating: "Rating",
    duration_seconds: "Duration",
    time_creation: "Time creation",
}
export const SORT_BY_ENTRIES = Object.entries(SORT_BY_OPTIONS) as [sort_by_types, string][]

/** Map UI/url sort key to the query param the API expects. */
export function sortByToApiParam(value: sort_by_types): sort_by_api_types {
    if (value === "time_creation") return "created_at"
    return value
}
