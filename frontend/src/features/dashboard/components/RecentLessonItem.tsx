import { Link } from "react-router-dom";
import type { IRecentLesson } from "../../../shared/interfaces/IDashboard";
import { formatRelativeTime } from "./formatRelativeTime";

type Props = {
    lesson: IRecentLesson;
    courseNavReturn: { returnTo: string };
    statusLabel: string;
    statusBadgeClassName: string;
    locale: string;
};

export function RecentLessonItem({
    lesson,
    courseNavReturn,
    statusLabel,
    statusBadgeClassName,
    locale,
}: Props) {
    return (
        <li className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
                <Link
                    to={`/course/${lesson.course_id}/lesson/${lesson.lesson_id}`}
                    state={courseNavReturn}
                    className="block truncate text-sm font-medium text-gray-900 hover:underline dark:text-slate-100"
                >
                    {lesson.lesson_title}
                </Link>
                <Link
                    to={`/course/${lesson.course_id}`}
                    state={courseNavReturn}
                    className="block truncate text-xs text-gray-500 hover:underline dark:text-slate-400"
                >
                    {lesson.course_title}
                </Link>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClassName}`}
                >
                    {statusLabel}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-slate-500">
                    {formatRelativeTime(lesson.last_activity_at, locale)}
                </span>
            </div>
        </li>
    );
}
