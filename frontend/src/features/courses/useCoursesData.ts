import { useEffect, useState } from "react";
import { useDebounce } from "../../shared/hooks/useDebounce";
import type { ICourses } from "../../shared/interfaces/ICourses";
import { get_courses } from "./api";
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
    const [courses, setCourses] = useState<ICourses[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const debouncedSearch = useDebounce(query.search, 500);
    const { currentPage, sortBy, sortDirection, filters } = query;

    useEffect(() => {
        // A slow response for page 2 must not overwrite the results of page 3.
        let cancelled = false;

        const fetchCourses = async () => {
            setLoading(true);
            try {
                const active = Object.fromEntries(
                    FILTER_DEFS.map(({ param }) => [
                        param,
                        filters[param].length > 0 ? filters[param] : undefined,
                    ]),
                );
                const response = await get_courses({
                    ...active,
                    search: debouncedSearch,
                    limit: PAGE_SIZE,
                    offset: (currentPage - 1) * PAGE_SIZE,
                    sort_by: sortBy,
                    order: sortDirection,
                });
                if (cancelled) return;
                setCourses(response.courses);
                setTotal(response.total);
            } catch (e) {
                console.error("Error cargando cursos: ", e);
                if (cancelled) return;
                setCourses([]);
                setTotal(0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void fetchCourses();
        return () => {
            cancelled = true;
        };
    }, [currentPage, debouncedSearch, filters, sortBy, sortDirection]);

    return { courses, total, loading };
}
