import { Trans, useTranslation } from "react-i18next";
import { RecommendedCoursesCarousel } from "../../shared/components/RecommendedCoursesCarousel";
import { useAuth } from "../../shared/provider/AuthContext";
import { CoursesFilterBar } from "./components/CoursesFilterBar";
import { CoursesResults } from "./components/CoursesResults";
import { useCoursesData } from "./useCoursesData";
import { useCoursesQuery } from "./useCoursesQuery";

/**
 * The course catalogue.
 *
 * Only the page layout lives here. The query state is owned by
 * `useCoursesQuery` (the URL is the source of truth), the fetching by
 * `useCoursesData`, and the two blocks of markup by their own components.
 */
export function Courses() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const query = useCoursesQuery();
    const { courses, total, loading } = useCoursesData(query);

    return (
        <div className="min-h-screen bg-neutral-100 p-14 dark:bg-surface">
            <section className="mb-8 flex w-full flex-col items-center justify-center">
                <h1 className="mb-4 text-4xl font-light text-slate-900 dark:text-slate-100">
                    <Trans
                        i18nKey="courses.heroTitle"
                        components={{
                            1: <span className="italic text-gray-500 dark:text-slate-400" />,
                        }}
                    />
                </h1>

                <input
                    type="text"
                    placeholder={t("courses.searchPlaceholder")}
                    aria-label={t("courses.searchPlaceholder")}
                    value={query.search}
                    onChange={(e) => query.setSearch(e.target.value)}
                    className="w-full max-w-3xl rounded-full border border-gray-200 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-gray-400 focus:border-uned-primary focus:outline-none focus:ring-1 focus:ring-uned-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
            </section>

            <CoursesFilterBar
                filters={query.filters}
                onFilterChange={query.setFilter}
                sortBy={query.sortBy}
                sortDirection={query.sortDirection}
                onSortByChange={query.setSortBy}
                onToggleSortDirection={query.toggleSortDirection}
                total={total}
                user={user}
            />

            <div className="flex gap-6">
                <main className="flex-1">
                    <CoursesResults
                        courses={courses}
                        total={total}
                        loading={loading}
                        currentPage={query.currentPage}
                        onPageChange={query.setPage}
                    />
                </main>
            </div>

            <RecommendedCoursesCarousel className="mt-10" hideForAdmin />
        </div>
    );
}
