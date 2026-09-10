import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ITopCourse } from "../../../shared/interfaces/IDashboard";

type Props = {
    topCourses: ITopCourse[];
};

/** Ranked list of the courses with the most enrollments in the selected period. */
export function PopularCoursesSection({ topCourses }: Props) {
    const { t } = useTranslation();

    return (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-600">
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                    {t("landing.popularCoursesTitle")}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                    {t("landing.popularCoursesSubtitle")}
                </p>
            </div>
            {topCourses.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    {t("landing.noEnrollmentsYet")}
                </div>
            ) : (
                <ol className="divide-y divide-gray-100 dark:divide-slate-700">
                    {topCourses.map((c, idx) => (
                        <li
                            key={c.course_id}
                            className="flex items-center justify-between px-4 py-2 text-sm"
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-slate-700 dark:text-slate-200">
                                    {idx + 1}
                                </span>
                                <Link
                                    to={`/course/${c.course_id}`}
                                    className="truncate text-gray-900 hover:underline dark:text-slate-100"
                                >
                                    {c.course_title}
                                </Link>
                            </span>
                            <span className="ml-2 shrink-0 text-gray-600 dark:text-slate-300">
                                {c.enrollments_count}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
