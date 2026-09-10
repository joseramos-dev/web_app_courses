import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { IRecentAttempt } from "../../../shared/interfaces/IProgress";
import type { LessonType } from "../../course_edit/lessonTypes";
import { LessonTypeIcon } from "../../../shared/components/LessonTypeIcon";
import { formatRelativeTime } from "./formatRelativeTime";
import { ShowMoreToggle } from "./ShowMoreToggle";
import type { useExpandableList } from "./useExpandableList";

type Props = {
    expand: ReturnType<typeof useExpandableList<IRecentAttempt>>;
    courseNavReturn: { returnTo: string };
    lessonTypeLabels: Record<LessonType, string>;
    locale: string;
};

export function RecentAttemptsTable({
    expand,
    courseNavReturn,
    lessonTypeLabels,
    locale,
}: Props) {
    const { t } = useTranslation();
    return (
        <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400">
                        <th className="pb-2 pr-3 font-medium">{t("dashboard.student.performance.table.course")}</th>
                        <th className="pb-2 pr-3 font-medium">{t("dashboard.student.performance.table.lesson")}</th>
                        <th className="pb-2 pr-3 font-medium">{t("dashboard.student.performance.table.score")}</th>
                        <th className="pb-2 pr-3 font-medium">{t("dashboard.student.performance.table.status")}</th>
                        <th className="pb-2 font-medium">{t("dashboard.student.performance.table.date")}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {expand.visibleItems.map((a) => (
                        <tr key={a.id}>
                            <td className="py-2 pr-3">
                                <Link
                                    to={`/course/${a.course_id}`}
                                    state={courseNavReturn}
                                    className="font-medium text-gray-900 hover:underline dark:text-slate-100"
                                >
                                    {a.course_title}
                                </Link>
                            </td>
                            <td className="py-2 pr-3">
                                <Link
                                    to={`/course/${a.course_id}/lesson/${a.lesson_id}`}
                                    state={courseNavReturn}
                                    className="flex items-center gap-2 text-gray-700 hover:underline dark:text-slate-300"
                                >
                                    <LessonTypeIcon
                                        lessonType={a.lesson_type as LessonType}
                                        className="size-4 shrink-0"
                                    />
                                    <span className="min-w-0">
                                        <span className="block font-medium text-gray-900 dark:text-slate-100">
                                            {a.lesson_title}
                                        </span>
                                        <span className="block text-xs text-gray-500 dark:text-slate-400">
                                            {lessonTypeLabels[a.lesson_type as LessonType] ?? a.lesson_type}
                                        </span>
                                    </span>
                                </Link>
                            </td>
                            <td className="py-2 pr-3 font-medium text-gray-900 dark:text-slate-100">
                                {Math.round(a.score)}%
                            </td>
                            <td className="py-2 pr-3">
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                        a.passed
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200"
                                            : "bg-red-100 text-red-700 dark:bg-red-900/35 dark:text-red-200"
                                    }`}
                                >
                                    {a.passed
                                        ? t("dashboard.student.performance.passed")
                                        : t("dashboard.student.performance.failed")}
                                </span>
                            </td>
                            <td className="py-2 text-xs text-gray-500 dark:text-slate-400">
                                {formatRelativeTime(a.attempted_at, locale)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <ShowMoreToggle
                canExpand={expand.canExpand}
                isExpanded={expand.isExpanded}
                hiddenCount={expand.hiddenCount}
                onToggle={expand.toggle}
            />
        </div>
    );
}
