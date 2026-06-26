import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CourseCard } from "./components/CourseCard";
import { get_courses } from "./api";
import type { ICourses } from "../../shared/interfaces/ICourses";
import Pagination from '@mui/material/Pagination';
import { useDebounce } from "../../shared/hooks/useDebounce";
import { FilterDropDown } from "./components/FilterDropDown";
import { courseTypesDict, type SiteTypes, type CategoryTypes, type LanguageTypes, type CourseTypeTypes } from "../../shared/types/CourseTypes";
import { type sort_by_dir, SORT_BY_ENTRIES, type sort_by_types } from "../../shared/types/SortTypes";
import { useAuth } from "../../shared/povider/AuthContext";
import { RecommendedCoursesCarousel } from "../../shared/components/RecommendedCoursesCarousel";


const PAGE_SIZE = 24

// Maps the dict key used in courseTypesDict to the URL param name we keep.
const FILTER_PARAM_KEY: Record<string, "site" | "category" | "language" | "course_type"> = {
    SiteTypes: "site",
    CategoryTypes: "category",
    LanguageTypes: "language",
    CourseTypeTypes: "course_type",
}

// Whitelists used to sanitize URL params. Anything not present here is
// silently dropped, so a manually-edited URL with a typo (e.g.
// `language=Non%20defin`) will never reach the backend (which would
// otherwise reject it with 422 and leave the page blank).
const VALID_SITES = courseTypesDict.SiteTypes as readonly string[]
const VALID_CATEGORIES = courseTypesDict.CategoryTypes as readonly string[]
const VALID_LANGUAGES = courseTypesDict.LanguageTypes as readonly string[]
const VALID_COURSE_TYPES = courseTypesDict.CourseTypeTypes as readonly string[]
const VALID_SORT_BY: readonly string[] = SORT_BY_ENTRIES.map(([k]) => k)
const VALID_ORDER: readonly string[] = ["asc", "desc"]

const filterValid = <T extends string>(
    values: string[],
    whitelist: readonly string[],
): T[] => values.filter((v) => whitelist.includes(v)) as T[]

export function Courses() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();

    // ----- derived state from URL (single source of truth) -----
    // Each read is sanitized: unknown enum values are silently dropped, the
    // page is clamped to a positive integer, and sort fields fall back to
    // their defaults. This prevents a hand-edited URL from sending invalid
    // params to the backend (which would otherwise return 422).
    const search = searchParams.get("search") ?? ""

    const rawPage = Number(searchParams.get("page") ?? "1")
    const currentPage =
        Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1

    const rawSortBy = searchParams.get("sort_by")
    const sortBy = (
        rawSortBy && VALID_SORT_BY.includes(rawSortBy) ? rawSortBy : "title"
    ) as sort_by_types

    const rawOrder = searchParams.get("order")
    const sortDirection = (
        rawOrder && VALID_ORDER.includes(rawOrder) ? rawOrder : "asc"
    ) as sort_by_dir

    const siteFilter = filterValid<SiteTypes>(
        searchParams.getAll("site"),
        VALID_SITES,
    )
    const categoryFilter = filterValid<CategoryTypes>(
        searchParams.getAll("category"),
        VALID_CATEGORIES,
    )
    const languageFilter = filterValid<LanguageTypes>(
        searchParams.getAll("language"),
        VALID_LANGUAGES,
    )
    const courseTypeFilter = filterValid<CourseTypeTypes>(
        searchParams.getAll("course_type"),
        VALID_COURSE_TYPES,
    )

    const debouncedSearch = useDebounce(search, 500)

    const [courses, setCourses] = useState<ICourses[]>([])
    const [total, setTotal] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(false)

    // Atomically patch one or more URL params while keeping the rest.
    // Empty strings, empty arrays and `null` remove the param to keep
    // the URL clean.
    const updateParams = (
        patch: Record<string, string | string[] | null>,
        opts?: { replace?: boolean }
    ) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            for (const [k, v] of Object.entries(patch)) {
                next.delete(k)
                if (v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue
                if (Array.isArray(v)) v.forEach((x) => next.append(k, x))
                else next.set(k, v)
            }
            return next
        }, { replace: opts?.replace ?? false })
    }

    // `replace: true` while typing avoids spamming the history with one
    // entry per keystroke. Resetting page to 1 is automatic via `null`.
    const handleSearchChange = (value: string) =>
        updateParams({ search: value || null, page: null }, { replace: true })

    const handlePageChange = (page: number) =>
        updateParams({ page: page > 1 ? String(page) : null })

    const handleSortByChange = (value: sort_by_types) =>
        updateParams({
            sort_by: value === "title" ? null : value,
            order: "asc",
            page: null,
        })

    const handleSortDirectionToggle = () =>
        updateParams({ order: sortDirection === "asc" ? "desc" : "asc" })

    const handleFilterChange = (
        paramKey: "site" | "category" | "language" | "course_type",
        selected: string[]
    ) => updateParams({ [paramKey]: selected, page: null })

    // Self-heal the URL: if it contains unknown enum values, an out-of-range
    // page or any unrecognized key, rewrite it (with `replace: true` so we
    // don't pollute history) keeping only the sanitized values.
    useEffect(() => {
        const cleaned = new URLSearchParams()
        for (const [k, v] of searchParams.entries()) {
            switch (k) {
                case "search":
                    if (v) cleaned.append(k, v)
                    break
                case "page": {
                    const n = Number(v)
                    if (Number.isFinite(n) && n >= 1) cleaned.append(k, String(Math.floor(n)))
                    break
                }
                case "sort_by":
                    if (VALID_SORT_BY.includes(v)) cleaned.append(k, v)
                    break
                case "order":
                    if (VALID_ORDER.includes(v)) cleaned.append(k, v)
                    break
                case "site":
                    if (VALID_SITES.includes(v)) cleaned.append(k, v)
                    break
                case "category":
                    if (VALID_CATEGORIES.includes(v)) cleaned.append(k, v)
                    break
                case "language":
                    if (VALID_LANGUAGES.includes(v)) cleaned.append(k, v)
                    break
                case "course_type":
                    if (VALID_COURSE_TYPES.includes(v)) cleaned.append(k, v)
                    break
                // unknown keys are silently dropped
            }
        }
        if (searchParams.toString() !== cleaned.toString()) {
            setSearchParams(cleaned, { replace: true })
        }
    }, [searchParams, setSearchParams])

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true)
            try {
                const offset = (currentPage - 1) * PAGE_SIZE
                const response = await get_courses({
                    search: debouncedSearch,
                    limit: PAGE_SIZE,
                    offset,
                    site: siteFilter.length > 0 ? siteFilter : undefined,
                    category: categoryFilter.length > 0 ? categoryFilter : undefined,
                    language: languageFilter.length > 0 ? languageFilter : undefined,
                    course_type: courseTypeFilter.length > 0 ? courseTypeFilter : undefined,
                    sort_by: sortBy,
                    order: sortDirection,
                })
                setCourses(response.courses)
                setTotal(response.total)
            } catch (e) {
                console.error("Error cargando cursos: ", e)
                setCourses([])
                setTotal(0)
            } finally {
                setLoading(false)
            }
        }
        fetchCourses()
        // Filter arrays are joined into a primitive so the effect re-runs
        // only when their *contents* change, not their reference.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        currentPage,
        debouncedSearch,
        siteFilter.join(","),
        categoryFilter.join(","),
        languageFilter.join(","),
        courseTypeFilter.join(","),
        sortBy,
        sortDirection,
    ])

    return (
        <div className="min-h-screen bg-neutral-100 p-14 dark:bg-surface">

            {/* SEARCH */}
            <section className="mb-8 flex w-full flex-col items-center justify-center">
                <h1 className="mb-4 text-4xl font-light text-slate-900 dark:text-slate-100">
                    Encuentra tu próximo{" "}
                    <span className="italic text-gray-500 dark:text-slate-400">curso</span>
                </h1>

                <input
                    type="text"
                    placeholder="Buscar cursos..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full max-w-3xl rounded-full border border-gray-200 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-gray-400 focus:border-uned-primary focus:outline-none focus:ring-1 focus:ring-uned-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
            </section>

            {/* FILTER & ORDER */}
            <div className="w-full mb-8 min-h-14 flex flex-wrap gap-2">
                {
                    Object.entries(courseTypesDict).map(([k, v]) => {
                        const paramKey = FILTER_PARAM_KEY[k]
                        if (!paramKey) return null
                        const currentValue =
                            paramKey === "site" ? (siteFilter as string[])
                                : paramKey === "category" ? (categoryFilter as string[])
                                    : paramKey === "language" ? (languageFilter as string[])
                                        : (courseTypeFilter as string[])
                        return (
                            <FilterDropDown
                                key={k}
                                label={k}
                                options={v}
                                value={currentValue}
                                onChange={(selected) => handleFilterChange(paramKey, selected)}
                            />
                        )
                    })
                }
                <button
                    type="button"
                    className="py-2 pl-4 text-slate-800 dark:text-slate-200"
                    onClick={handleSortDirectionToggle}
                >
                    {sortDirection === "asc" ? "▼" : "▲"}
                </button>
                <select
                    value={sortBy}
                    onChange={(e) => {
                        const sort_by_value = e.target.value as sort_by_types
                        handleSortByChange(sort_by_value)
                    }}
                    className="rounded p-2 text-slate-800 appearance-none focus:outline-none dark:text-slate-200"
                >
                    {
                        SORT_BY_ENTRIES.map(([k, v]) =>
                            <option key={k} value={k}>Order by: {v} </option>
                        )
                    }
                </select>

                <p className="p-3 text-slate-800 dark:text-slate-200">{total} cursos encontrados</p>

                {user && (user.role === "instructor" || user.role === "admin") ? (
                    <Link
                        to="/course/new"
                        className="ml-auto inline-flex items-center rounded-lg bg-uned-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-uned-primary-hover"
                    >
                        Crear curso
                    </Link>
                ) : null}

            </div>

            {/* LAYOUT */}
            <div className="flex gap-6">

                {/* MAIN */}
                <main className="flex-1">

                    {/* GRID */}
                    {
                        loading ? (
                            <div className="py-10 text-center text-slate-800 dark:text-slate-200">
                                Loading courses...
                            </div>
                        ) : courses.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center gap-4 py-16 text-center"
                                role="status"
                                aria-live="polite"
                            >
                                <span
                                    className="text-6xl leading-none select-none"
                                    aria-hidden
                                >
                                    🙁
                                </span>
                                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                                    No se han encontrado cursos
                                </p>
                                <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                                    Prueba a cambiar la búsqueda o los filtros.
                                </p>
                            </div>
                        ) : (
                            <div className="w-full flex flex-col justify-center">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {courses.map((course) => (
                                        <CourseCard key={course.id} course={course} />
                                    ))}
                                </div>
                                <Pagination
                                    className="w-auto p-12 justify-center"
                                    count={calculateTotalPages(total)}
                                    page={currentPage}
                                    siblingCount={2}
                                    boundaryCount={2}
                                    onChange={(_, page) => handlePageChange(page)}
                                    size="large"
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        paddingY: 4,
                                        '& .MuiPaginationItem-root': {
                                            fontFamily: 'Arial, Helvetica, sans-serif',
                                            color: 'inherit',
                                        },
                                        '& .Mui-selected': {
                                            backgroundColor: 'var(--uned-primary) !important',
                                            color: '#fff',
                                        },
                                        '& .MuiPaginationItem-root:hover': {
                                            backgroundColor: 'color-mix(in srgb, var(--uned-primary) 22%, transparent)',
                                        },
                                    }}
                                />
                            </div>
                        )
                    }

                </main>
            </div>

            <RecommendedCoursesCarousel className="mt-10" hideForAdmin />
        </div>
    );
}

const calculateTotalPages = (totalCourses: number): number => {
    return totalCourses % PAGE_SIZE === 0 ? totalCourses / PAGE_SIZE : Math.floor(totalCourses / PAGE_SIZE) + 1
}
