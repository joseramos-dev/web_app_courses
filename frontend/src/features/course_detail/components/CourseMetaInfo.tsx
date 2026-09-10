import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ICourses } from "../../../shared/interfaces/ICourses";
import { formatDuration } from "../../../shared/utils/formatDuration";
import { getDifficultyLabels } from "../../../shared/types/CourseTypes";

type Props = {
    course: ICourses;
};

/** The `<dl>`-style block of instructor/lesson-count/duration/rating/difficulty facts. */
export function CourseMetaInfo({ course }: Props) {
    const { t } = useTranslation();
    const difficultyLabels = getDifficultyLabels(t);
    const durationLabel = formatDuration(course.duration_seconds);

    return (
        <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {course.instructor_name ? (
                <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                        {t("courseDetail.instructor")}
                    </dt>
                    <dd className="mt-1 text-gray-800 dark:text-slate-100">
                        {course.instructor_name}
                        {(course.instructor_courses_count ?? 0) > 0 ? (
                            <span className="text-gray-500 dark:text-slate-400">
                                {" "}
                                ·{" "}
                                {t("courseDetail.instructorCourseCount", {
                                    count: course.instructor_courses_count,
                                })}
                            </span>
                        ) : null}
                    </dd>
                </div>
            ) : null}
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                    {t("courseDetail.lessonsMeta")}
                </dt>
                <dd className="mt-1 text-gray-800 dark:text-slate-100">
                    {t("courseDetail.lessonCount", {
                        count: course.lessons_count,
                    })}
                </dd>
            </div>
            {durationLabel ? (
                <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                        {t("courseDetail.duration")}
                    </dt>
                    <dd className="mt-1 text-gray-800 dark:text-slate-100">{durationLabel}</dd>
                </div>
            ) : null}
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                    {t("courseDetail.rating")}
                </dt>
                <dd className="mt-1 flex items-center gap-1 text-gray-800 dark:text-slate-100">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    {course.rating != null ? (
                        <>
                            {course.rating.toFixed(1)}
                            <span className="text-gray-500 dark:text-slate-400">
                                (
                                {t("courseDetail.ratingCount", {
                                    count: course.ratings_count,
                                })}
                                )
                            </span>
                        </>
                    ) : (
                        t("courseDetail.noRatingsYet")
                    )}
                </dd>
            </div>
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                    {t("courseDetail.difficulty")}
                </dt>
                <dd className="mt-1 text-gray-800 dark:text-slate-100">
                    {difficultyLabels[course.difficulty]}
                </dd>
            </div>
        </dl>
    );
}
