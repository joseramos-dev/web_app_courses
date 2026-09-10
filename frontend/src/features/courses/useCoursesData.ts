import { useEffect } from "react";
import { useDebounce } from "../../shared/hooks/useDebounce";
import type { ICourses } from "../../shared/interfaces/ICourses";
import { get_courses } from "./api";
import { useAsyncData } from "../../shared/hooks/useAsyncData";
import { FILTER_DEFS, PAGE_SIZE, type CoursesQuery } from "./useCoursesQuery";

type CoursesData = {
    courses: ICourses[];
    total: number;
    loading: boolean;
};

/**
 * Fetches the page of courses described by `query`.
 *
 * `filters` can be listed as a plain dependency because `useCoursesQuery`
 * memoises it: the previous version rebuilt the arrays on every render, and
 * worked around the refetch storm with a list of `.join(",")` calls and a
 * disabled exhaustive-deps rule.
 */
export function useCoursesData(query: CoursesQuery): CoursesData {
    const debouncedSearch = useDebounce(query.search, 500);
    const { currentPage, sortBy, sortDirection, filters } = query;

    const { data, loading, error, setData } = useAsyncData(
        () => {
            const active = Object.fromEntries(
                FILTER_DEFS.map(({ param }) => [
                    param,
                    filters[param].length > 0 ? filters[param] : undefined,
                ]),
            );
            return get_courses({
                ...active,
                search: debouncedSearch,
                limit: PAGE_SIZE,
                offset: (currentPage - 1) * PAGE_SIZE,
                sort_by: sortBy,
                order: sortDirection,
            });
        },
        [currentPage, debouncedSearch, filters, sortBy, sortDirection],
    );

    // A failed request must not leave a stale page of results on screen:
    // this hook exposes no `error`, so `Courses.tsx` has no way to tell a
    // failure apart from "no matches" other than an empty list.
    useEffect(() => {
        if (!error) return;
        setData((prev) =>
            prev
                ? { ...prev, courses: [], total: 0 }
                : { courses: [], total: 0, limit: PAGE_SIZE, offset: 0 },
        );
    }, [error, setData]);

    return { courses: data?.courses ?? [], total: data?.total ?? 0, loading };
}
