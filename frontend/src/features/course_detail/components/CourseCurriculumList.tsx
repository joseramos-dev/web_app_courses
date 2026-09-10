import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Circle,
    Clock,
    Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ICourses } from "../../../shared/interfaces/ICourses";
import type { ILesson, ITopicWithLessons } from "../../course_edit/lessonTypes";
import type {
    IEnrollmentDetail,
    LessonProgressStatus,
} from "../../../shared/interfaces/IEnrollment";
import type { CourseNavState } from "../../../shared/types/CourseNavState";
import { formatDuration } from "../../../shared/utils/formatDuration";
import { isLessonUnlocked } from "../../../shared/utils/lessonAccessUtils";
import { LessonTypeIcon } from "../../../shared/components/LessonTypeIcon";

type Props = {
    course: ICourses;
    topics: ITopicWithLessons[];
    enrollment: IEnrollmentDetail | null;
    lessonNumbers: Map<number, number>;
    progressByLesson: Map<number, LessonProgressStatus>;
    pendingSet: Set<number>;
    canOpenLessons: boolean;
    isStaff: boolean;
    lessonNavState: CourseNavState;
};

function LessonStatusIcon({
    status,
    pendingReview,
}: {
    status: LessonProgressStatus;
    pendingReview: boolean;
}) {
    if (pendingReview)
        return <Clock className="size-4 text-amber-600 dark:text-amber-400" />;
    if (status === "completed")
        return <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />;
    return <Circle className="size-4 text-gray-400 dark:text-slate-500" />;
}

function CollapsibleTopicSection({
    topic,
    lessonNumbers,
    renderLessonRow,
    progressByLesson,
    isEnrolled,
}: {
    topic: ITopicWithLessons;
    lessonNumbers: Map<number, number>;
    renderLessonRow: (lesson: ILesson, globalIndex: number) => ReactNode;
    progressByLesson: Map<number, LessonProgressStatus>;
    isEnrolled: boolean;
}) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const sortedLessons = useMemo(
        () => [...topic.lessons].sort((a, b) => a.position - b.position),
        [topic.lessons],
    );
    const panelId = `topic-panel-${topic.id}`;

    const completedCount = sortedLessons.filter(
        (lesson) => progressByLesson.get(lesson.id) === "completed",
    ).length;
    const headerClass =
        isEnrolled && sortedLessons.length > 0 && completedCount === sortedLessons.length
            ? "bg-green-200/70 hover:bg-green-200 dark:bg-green-800/40 dark:hover:bg-green-800/55"
            : isEnrolled && completedCount > 0
              ? "bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30"
              : "bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/40 dark:hover:bg-slate-700/60";

    return (
        <div className="overflow-hidden rounded-lg border border-uned-accent/25 bg-white shadow-sm dark:border-uned-primary/30 dark:bg-slate-800">
            <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setExpanded((value) => !value)}
                className={`flex w-full items-center gap-2 px-3 py-3 text-left transition ${headerClass}`}
            >
                {expanded ? (
                    <ChevronUp className="size-4 shrink-0 text-uned-accent dark:text-uned-primary" />
                ) : (
                    <ChevronDown className="size-4 shrink-0 text-uned-accent dark:text-uned-primary" />
                )}
                <span className="min-w-0 flex-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                    {topic.name}
                </span>
                {formatDuration(topic.duration_seconds) ? (
                    <span className="shrink-0 text-xs text-gray-500 dark:text-slate-400">
                        {formatDuration(topic.duration_seconds)}
                    </span>
                ) : null}
                <span className="shrink-0 rounded-full bg-uned-accent/15 px-2 py-0.5 text-xs font-medium text-uned-accent dark:bg-uned-primary/20 dark:text-uned-primary">
                    {t("courseDetail.topicLessonCount", { count: sortedLessons.length })}
                </span>
            </button>
            {expanded ? (
                <div
                    id={panelId}
                    className="space-y-2 border-t border-uned-accent/15 bg-white px-3 pb-3 pt-2 dark:border-uned-primary/20 dark:bg-slate-900/40"
                >
                    {sortedLessons.map((lesson) =>
                        renderLessonRow(lesson, lessonNumbers.get(lesson.id) ?? 0),
                    )}
                </div>
            ) : null}
        </div>
    );
}

/**
 * Renders the full curriculum accordion: one collapsible section per topic,
 * each listing its lessons with lock/progress status and a link to open
 * unlocked ones. Purely presentational - all data is passed in as props.
 */
export function CourseCurriculumList({
    course,
    topics,
    enrollment,
    lessonNumbers,
    progressByLesson,
    pendingSet,
    canOpenLessons,
    isStaff,
    lessonNavState,
}: Props) {
    const { t } = useTranslation();

    const renderLessonRow = (lesson: ILesson, globalIndex: number) => {
        const status = progressByLesson.get(lesson.id) ?? "not_started";
        const pending = pendingSet.has(lesson.id);
        const unlocked = isLessonUnlocked(course, enrollment, lesson.id, isStaff);
        const locked = canOpenLessons && !unlocked;

        const row = (
            <div
                title={locked ? t("courseDetail.lessonLockedHint") : undefined}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                    locked
                        ? "cursor-not-allowed border-gray-200/60 bg-white/40 opacity-60 dark:border-slate-700 dark:bg-slate-900/30"
                        : canOpenLessons
                          ? "border-gray-200/90 bg-white/70 hover:border-gray-300 hover:bg-white dark:border-slate-600 dark:bg-slate-900/50 dark:hover:border-slate-500"
                          : "border-gray-200/90 bg-white/50 opacity-90 dark:border-slate-600 dark:bg-slate-900/40"
                }`}
            >
                <LessonTypeIcon lessonType={lesson.lesson_type} />
                {canOpenLessons ? (
                    locked ? (
                        <Lock className="size-4 shrink-0 text-gray-400 dark:text-slate-500" />
                    ) : (
                        <LessonStatusIcon status={status} pendingReview={pending} />
                    )
                ) : (
                    <Lock className="size-4 shrink-0 text-gray-400 dark:text-slate-500" />
                )}
                <div className="min-w-0 flex-1">
                    <div
                        className={`truncate text-sm font-medium ${
                            locked
                                ? "text-gray-500 dark:text-slate-500"
                                : "text-gray-800 dark:text-slate-100"
                        }`}
                    >
                        {globalIndex}. {lesson.title}
                    </div>
                </div>
                {formatDuration(lesson.duration_seconds) ? (
                    <span className="shrink-0 text-xs text-gray-500 dark:text-slate-400">
                        {formatDuration(lesson.duration_seconds)}
                    </span>
                ) : null}
            </div>
        );

        if (!canOpenLessons || locked) return <div key={lesson.id}>{row}</div>;
        return (
            <Link
                key={lesson.id}
                to={`/course/${course.id}/lesson/${lesson.id}`}
                state={lessonNavState}
                className="block"
            >
                {row}
            </Link>
        );
    };

    return (
        <section className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {t("courseDetail.curriculumTitle")}
            </h2>
            <div className="mt-4 space-y-3">
                {[...topics]
                    .sort((a, b) => a.position - b.position)
                    .map((topic) => (
                        <CollapsibleTopicSection
                            key={topic.id}
                            topic={topic}
                            lessonNumbers={lessonNumbers}
                            renderLessonRow={renderLessonRow}
                            progressByLesson={progressByLesson}
                            isEnrolled={enrollment != null}
                        />
                    ))}
            </div>
        </section>
    );
}
