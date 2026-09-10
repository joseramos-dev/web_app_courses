import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { IUser } from "../../../shared/interfaces/IUser";
import {
    courseTypesDict,
    getDifficultyLabels,
    getDurationBucketShortLabels,
} from "../../../shared/types/CourseTypes";
import type { sort_by_dir, sort_by_types } from "../../../shared/types/SortTypes";
import { FILTER_DEFS, type CourseFilters, type FilterParam } from "../useCoursesQuery";
import { FilterDropDown } from "./FilterDropDown";
import { SortControls } from "./SortControls";

/**
 * The visible half of each filter: which translation names it, and whether its
 * options need translating too.
 *
 * Four of the six used to be built from one pair of lookup maps and the other
 * two written out by hand, with a four-level nested ternary picking the current
 * value -- one that quietly fell back to `course_type` for an unknown key. All
 * six are one list now, and the options and whitelists still come from
 * `FILTER_DEFS`, so the two halves cannot drift apart.
 */
const LABEL_KEY: Record<FilterParam, string> = {
    site: "preferences.platform",
    category: "preferences.category",
    language: "preferences.language",
    course_type: "preferences.courseType",
    duration_bucket: "courses.filters.duration",
    difficulty: "courses.filters.difficulty",
};

type Props = {
    filters: CourseFilters;
    onFilterChange: (param: FilterParam, selected: string[]) => void;
    sortBy: sort_by_types;
    sortDirection: sort_by_dir;
    onSortByChange: (value: sort_by_types) => void;
    onToggleSortDirection: () => void;
    total: number;
    user: IUser | null;
};

export function CoursesFilterBar({
    filters,
    onFilterChange,
    sortBy,
    sortDirection,
    onSortByChange,
    onToggleSortDirection,
    total,
    user,
}: Props) {
    const { t } = useTranslation();
    // Only these two have values worth translating; the rest are proper nouns
    // ("Coursera") or already read well as they are.
    const optionLabelsFor: Partial<Record<FilterParam, Record<string, string>>> = {
        duration_bucket: getDurationBucketShortLabels(t),
        difficulty: getDifficultyLabels(t),
    };
    const canCreateCourse = user?.role === "instructor" || user?.role === "admin";

    return (
        <div className="w-full mb-8 min-h-14 flex flex-wrap gap-2">
            {FILTER_DEFS.map(({ param, dictKey }) => (
                <FilterDropDown
                    key={param}
                    label={t(LABEL_KEY[param])}
                    options={[...courseTypesDict[dictKey]]}
                    optionLabels={optionLabelsFor[param]}
                    value={filters[param]}
                    onChange={(selected) => onFilterChange(param, selected)}
                />
            ))}

            <SortControls
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortByChange={onSortByChange}
                onToggleDirection={onToggleSortDirection}
            />

            <p className="p-3 text-slate-800 dark:text-slate-200">
                {t("courses.foundCount", { count: total })}
            </p>

            {canCreateCourse && (
                <Link
                    to="/course/new"
                    className="ml-auto inline-flex items-center rounded-lg bg-uned-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-uned-primary-hover"
                >
                    {t("courses.createCourse")}
                </Link>
            )}
        </div>
    );
}
