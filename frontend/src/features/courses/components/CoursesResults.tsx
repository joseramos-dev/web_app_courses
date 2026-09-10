import Pagination from "@mui/material/Pagination";
import { useTranslation } from "react-i18next";
import { paginationSx } from "../../../shared/components/paginationSx";
import type { ICourses } from "../../../shared/interfaces/ICourses";
import { PAGE_SIZE } from "../useCoursesQuery";
import { CourseCard } from "./CourseCard";
import { CourseCardSkeleton } from "./CourseCardSkeleton";

const SKELETON_COUNT = 6;
const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

type Props = {
    courses: ICourses[];
    total: number;
    loading: boolean;
    currentPage: number;
    onPageChange: (page: number) => void;
};

function LoadingGrid() {
    const { t } = useTranslation();
    return (
        <div className={GRID} role="status" aria-label={t("courses.loading")}>
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <CourseCardSkeleton key={index} />
            ))}
        </div>
    );
}

function EmptyState() {
    const { t } = useTranslation();
    return (
        <div
            className="flex flex-col items-center justify-center gap-4 py-16 text-center"
            role="status"
            aria-live="polite"
        >
            <span className="text-6xl leading-none select-none" aria-hidden>
                🙁
            </span>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                {t("courses.noResultsTitle")}
            </p>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                {t("courses.noResultsHint")}
            </p>
        </div>
    );
}

/** The three states of the catalogue: loading, nothing found, and results. */
export function CoursesResults({
    courses,
    total,
    loading,
    currentPage,
    onPageChange,
}: Props) {
    if (loading) return <LoadingGrid />;
    if (courses.length === 0) return <EmptyState />;

    // A plain ceiling. The hand-rolled version this replaces returned 0 pages
    // for an empty result set, because 0 % PAGE_SIZE is 0.
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="w-full flex flex-col justify-center">
            <div className={GRID}>
                {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                ))}
            </div>
            <Pagination
                className="w-auto p-12 justify-center"
                count={totalPages}
                page={currentPage}
                siblingCount={2}
                boundaryCount={2}
                onChange={(_, page) => onPageChange(page)}
                size="large"
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    paddingY: 4,
                    ...paginationSx,
                }}
            />
        </div>
    );
}
