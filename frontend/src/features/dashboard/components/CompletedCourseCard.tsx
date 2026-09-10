import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ICompletedCourseRow } from "../../../shared/interfaces/IDashboard";
import { formatRelativeTime } from "./formatRelativeTime";

type Props = {
    course: ICompletedCourseRow;
    courseNavReturn: { returnTo: string };
    locale: string;
};

export function CompletedCourseCard({ course, courseNavReturn, locale }: Props) {
    const { t } = useTranslation();
    return (
        <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-2">
                <Link
                    to={`/course/${course.course_id}`}
                    state={courseNavReturn}
                    className="text-sm font-semibold text-gray-900 hover:underline dark:text-slate-100"
                >
                    {course.course_title}
                </Link>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {t("dashboard.student.completedCourses.badge")}
                </span>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                {course.completed_at
                    ? t("dashboard.student.completedCourses.finishedAgo", {
                          time: formatRelativeTime(course.completed_at, locale),
                      })
                    : t("dashboard.student.completedCourses.finished")}
            </p>
            <div className="mt-3 flex justify-end">
                <Link
                    to={`/course/${course.course_id}`}
                    state={courseNavReturn}
                    className="text-xs font-semibold text-uned-primary hover:text-uned-primary-hover dark:text-uned-primary"
                >
                    {t("dashboard.student.completedCourses.viewCourse")}
                </Link>
            </div>
        </article>
    );
}
