import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { IRecentCourse } from "../../../shared/interfaces/IDashboard";
import { CourseProgressChart } from "../../../shared/components/charts/CourseProgressChart";
import { formatRelativeTime } from "./formatRelativeTime";

type Props = {
    course: IRecentCourse;
    courseNavReturn: { returnTo: string };
    locale: string;
};

export function ContinueLearningCourseCard({ course, courseNavReturn, locale }: Props) {
    const { t } = useTranslation();
    const continueHref = course.next_lesson_id
        ? `/course/${course.course_id}/lesson/${course.next_lesson_id}`
        : `/course/${course.course_id}`;
    return (
        <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <Link
                to={`/course/${course.course_id}`}
                state={courseNavReturn}
                className="text-sm font-semibold text-gray-900 hover:underline dark:text-slate-100"
            >
                {course.course_title}
            </Link>
            <div className="mt-2">
                <CourseProgressChart
                    value={course.progress_percent}
                    rightLabel={t("dashboard.student.continueLearning.lessonsCount", {
                        completed: course.completed_lessons_count,
                        total: course.total_lessons,
                    })}
                />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                <span>
                    {t("dashboard.student.continueLearning.lastActivity", {
                        time: formatRelativeTime(course.last_activity_at, locale),
                    })}
                </span>
                <Link
                    to={continueHref}
                    state={courseNavReturn}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                >
                    {t("dashboard.student.continueLearning.continue")}
                </Link>
            </div>
        </article>
    );
}
