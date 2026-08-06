import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Clock, Globe, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ICourses } from "../../../shared/interfaces/ICourses";

function formatDuration(seconds: number | null) {
    if (!seconds || seconds <= 0) return null;
    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}m`;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatRating(rating: number | null) {
    if (rating == null) return null;
    return rating.toFixed(1);
}

export function CourseCard({ course }: { course: ICourses }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { pathname, search } = useLocation();
    const duration = formatDuration(course.duration_seconds);
    const rating = formatRating(course.rating);
    const lessonsLabel = t("courses.card.lessons", { count: course.lessons_count });

    return (
        <article
            onClick={() =>
                navigate(`/course/${course.id}`, {
                    state: { returnTo: `${pathname}${search}` },
                })
            }
            className="group flex h-full cursor-pointer flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-600 dark:bg-slate-800"
        >
            {/* Header: category + course type badge */}
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">
                    {course.category}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                    {course.course_type}
                </span>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-lg font-medium text-gray-900 group-hover:text-uned-primary dark:text-slate-100 dark:group-hover:text-uned-primary">
                {course.title}
            </h2>

            {/* Intro */}
            {course.intro ? (
                <p className="mb-3 line-clamp-3 text-sm text-gray-600 dark:text-slate-300">
                    {course.intro}
                </p>
            ) : (
                <p className="mb-3 text-sm italic text-gray-400 dark:text-slate-500">
                    {t("courses.card.noDescription")}
                </p>
            )}

            {/* Spacer pushes the meta row to the bottom */}
            <div className="flex-1" />

            {/* Meta row: lessons, duration, rating */}
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-xs text-gray-600 dark:border-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1">
                    <BookOpen className="size-3.5 text-gray-400 dark:text-slate-500" />
                    <span title={t("courses.card.lessonsTitle")}>{lessonsLabel}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="size-3.5 text-gray-400 dark:text-slate-500" />
                    <span title={t("courses.card.durationTitle")}>{duration ?? "—"}</span>
                </div>
                <div className="flex items-center justify-end gap-1">
                    <Star className="size-3.5 text-yellow-500" />
                    <span title={t("courses.card.ratingTitle")}>
                        {rating != null && course.ratings_count > 0
                            ? `${rating} (${course.ratings_count})`
                            : "—"}
                    </span>
                </div>
            </div>

            {/* Footer row: site + language */}
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                <span className="font-semibold text-gray-700 dark:text-slate-200">{course.site}</span>
                <span className="flex items-center gap-1">
                    <Globe className="size-3.5 text-gray-400 dark:text-slate-500" />
                    {course.language}
                </span>
            </div>
        </article>
    );
}
