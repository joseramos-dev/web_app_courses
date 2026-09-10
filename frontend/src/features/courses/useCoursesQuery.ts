import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { courseTypesDict } from "../../shared/types/CourseTypes";
import {
    SORT_BY_KEYS,
    type sort_by_dir,
    type sort_by_types,
} from "../../shared/types/SortTypes";

/**
 * The catalogue's query state, with the URL as the single source of truth.
 *
 * Keeping it in the URL is what makes a filtered search shareable and
 * survivable across a reload; the cost is that anything can be typed into it,
 * so every read is sanitised and the URL itself is rewritten when it carries
 * values the app does not recognise.
 */

export const PAGE_SIZE = 24;

/**
 * The six filters, declared once.
 *
 * Both halves of the sanitising -- reading a value and cleaning the URL -- are
 * derived from this list. They used to be written out separately, which meant a
 * seventh filter had to be remembered in two places; forgetting the second was
 * invisible in review and let an unknown value through to the backend, which
 * answers 422 and leaves the page blank.
 */
export const FILTER_DEFS = [
    { param: "site", dictKey: "SiteTypes" },
    { param: "category", dictKey: "CategoryTypes" },
    { param: "language", dictKey: "LanguageTypes" },
    { param: "course_type", dictKey: "CourseTypeTypes" },
    { param: "duration_bucket", dictKey: "DurationBucketTypes" },
    { param: "difficulty", dictKey: "DifficultyTypes" },
] as const;

export type FilterParam = (typeof FILTER_DEFS)[number]["param"];
export type CourseFilters = Record<FilterParam, string[]>;

const optionsFor = (param: FilterParam): readonly string[] =>
    courseTypesDict[FILTER_DEFS.find((def) => def.param === param)!.dictKey];

const VALID_ORDER: readonly string[] = ["asc", "desc"];
const VALID_SORT_BY: readonly string[] = SORT_BY_KEYS;

const asPage = (raw: string | null): number => {
    const value = Number(raw ?? "1");
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
};

export type CoursesQuery = {
    search: string;
    currentPage: number;
    sortBy: sort_by_types;
    sortDirection: sort_by_dir;
    filters: CourseFilters;
    setSearch: (value: string) => void;
    setPage: (page: number) => void;
    setSortBy: (value: sort_by_types) => void;
    toggleSortDirection: () => void;
    setFilter: (param: FilterParam, selected: string[]) => void;
};

export function useCoursesQuery(): CoursesQuery {
    const [searchParams, setSearchParams] = useSearchParams();

    const search = searchParams.get("search") ?? "";
    const currentPage = asPage(searchParams.get("page"));

    const rawSortBy = searchParams.get("sort_by");
    const sortBy = (
        rawSortBy && VALID_SORT_BY.includes(rawSortBy) ? rawSortBy : "title"
    ) as sort_by_types;

    const rawOrder = searchParams.get("order");
    const sortDirection = (
        rawOrder && VALID_ORDER.includes(rawOrder) ? rawOrder : "asc"
    ) as sort_by_dir;

    // Memoised on the query string so the object keeps its identity while the
    // URL does not change. Consumers can then use it as an effect dependency
    // directly, instead of serialising it by hand to avoid refetching on every
    // render.
    const paramsKey = searchParams.toString();
    const filters = useMemo(() => {
        const params = new URLSearchParams(paramsKey);
        return Object.fromEntries(
            FILTER_DEFS.map(({ param }) => {
                const allowed = optionsFor(param);
                return [param, params.getAll(param).filter((v) => allowed.includes(v))];
            }),
        ) as CourseFilters;
    }, [paramsKey]);

    /**
     * Patch some params and leave the rest alone. Empty strings, empty arrays
     * and `null` remove the key, so the URL never grows `?search=&page=`.
     */
    const updateParams = (
        patch: Record<string, string | string[] | null>,
        opts?: { replace?: boolean },
    ) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                for (const [key, value] of Object.entries(patch)) {
                    next.delete(key);
                    if (value === null || value === "") continue;
                    if (Array.isArray(value)) value.forEach((item) => next.append(key, item));
                    else next.set(key, value);
                }
                return next;
            },
            { replace: opts?.replace ?? false },
        );
    };

    // Self-heal: drop unknown keys and invalid values, rewriting in place so the
    // history is not polluted with the correction.
    useEffect(() => {
        const cleaned = new URLSearchParams();
        for (const [key, value] of searchParams.entries()) {
            const filter = FILTER_DEFS.find((def) => def.param === key);
            if (filter) {
                if (courseTypesDict[filter.dictKey].includes(value)) cleaned.append(key, value);
                continue;
            }
            switch (key) {
                case "search":
                    if (value) cleaned.append(key, value);
                    break;
                case "page": {
                    const page = Number(value);
                    if (Number.isFinite(page) && page >= 1) {
                        cleaned.append(key, String(Math.floor(page)));
                    }
                    break;
                }
                case "sort_by":
                    if (VALID_SORT_BY.includes(value)) cleaned.append(key, value);
                    break;
                case "order":
                    if (VALID_ORDER.includes(value)) cleaned.append(key, value);
                    break;
                // anything else is dropped
            }
        }
        if (searchParams.toString() !== cleaned.toString()) {
            setSearchParams(cleaned, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    return {
        search,
        currentPage,
        sortBy,
        sortDirection,
        filters,
        // `replace` while typing: one history entry per keystroke would make the
        // back button useless.
        setSearch: (value) =>
            updateParams({ search: value || null, page: null }, { replace: true }),
        setPage: (page) => updateParams({ page: page > 1 ? String(page) : null }),
        setSortBy: (value) =>
            updateParams({
                sort_by: value === "title" ? null : value,
                order: "asc",
                page: null,
            }),
        toggleSortDirection: () =>
            updateParams({ order: sortDirection === "asc" ? "desc" : "asc" }),
        setFilter: (param, selected) => updateParams({ [param]: selected, page: null }),
    };
}
