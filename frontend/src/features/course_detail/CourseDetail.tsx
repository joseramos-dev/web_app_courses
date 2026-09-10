import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DetailBackButton } from "./components/DetailBackButton";
import { DetailActionButton } from "./components/DetailActionButton";
import { StudentCourseRating } from "./components/StudentCourseRating";
import { ProgressRing } from "./components/ProgressRing";
import { CourseCurriculumList } from "./components/CourseCurriculumList";
import { CourseMetaInfo } from "./components/CourseMetaInfo";
import { LessonVideo } from "../lesson/components/LessonVideo";
import { useAuth } from "../../shared/provider/AuthContext";
import { lessonChainState, type CourseNavState } from "../../shared/types/CourseNavState";
import { useCourseDetailData } from "./hooks/useCourseDetailData";

const INTRO_PREVIEW_LEN = 280;

function IntroText({ intro }: { intro: string }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const needsToggle = intro.length > INTRO_PREVIEW_LEN;
    const shown =
        expanded || !needsToggle ? intro : `${intro.slice(0, INTRO_PREVIEW_LEN).trim()}…`;

    return (
        <div className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
            <p className="whitespace-pre-wrap">{shown}</p>
            {needsToggle ? (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-600 dark:text-uned-primary dark:hover:text-uned-accent"
                >
                    {expanded ? (
                        <>
                            {t("courseDetail.showLess")} <ChevronUp className="size-4" />
                        </>
                    ) : (
                        <>
                            {t("courseDetail.showMore")} <ChevronDown className="size-4" />
                        </>
                    )}
                </button>
            ) : null}
        </div>
    );
}

export const CourseDetail = () => {
    const { t } = useTranslation();
    const { courseId } = useParams();
    const location = useLocation();
    const { user } = useAuth();

    const {
        course,
        curriculum,
        enrollment,
        isLoading,
        error,
        flatLessons,
        progressByLesson,
        pendingSet,
        isEnrolled,
        isStaff,
        canOpenLessons,
        continueLesson,
        progressPercent,
        canSubmitCourseRating,
        lessonNumbers,
        refetchEnrollment,
        refetchCourseSummary,
    } = useCourseDetailData(courseId);

    const lessonNavState: CourseNavState = lessonChainState(location.state);

    return (
        <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
            <div className="mb-6">
                <DetailBackButton />
            </div>

            {isLoading ? (
                <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {t("courseDetail.loadingCourse")}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                </div>
            ) : course && curriculum ? (
                <>
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <div className="min-w-0 lg:col-span-2">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl">
                                {course.title}
                            </h1>
                            {course.intro ? <IntroText intro={course.intro} /> : null}

                            <CourseMetaInfo course={course} />
                        </div>

                        <div className="lg:col-span-1">
                            <div className="sticky top-4 space-y-4 rounded-xl border border-gray-200 bg-surface-muted p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800">
                                {course.intro_video_url ? (
                                    <div className="overflow-hidden rounded-lg">
                                        <LessonVideo videoUrl={course.intro_video_url} />
                                    </div>
                                ) : null}

                                {isEnrolled ? (
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex shrink-0 items-center justify-center">
                                            <ProgressRing percent={progressPercent} />
                                            <span className="absolute text-sm font-bold text-gray-800 dark:text-slate-100">
                                                {Math.round(progressPercent)}%
                                            </span>
                                        </div>
                                        <div className="min-w-0 text-sm">
                                            {enrollment?.status === "completed" ? (
                                                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                                                    {t("courseDetail.courseCompletedBadge")}
                                                </p>
                                            ) : continueLesson ? (
                                                <>
                                                    <p className="text-gray-500 dark:text-slate-400">
                                                        {t("courseDetail.continueLabel")}
                                                    </p>
                                                    <p className="truncate font-medium text-gray-900 dark:text-slate-100">
                                                        {continueLesson.title}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-gray-600 dark:text-slate-300">
                                                    {t("courseDetail.yourProgress")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : null}

                                <DetailActionButton
                                    course={course}
                                    lessons={flatLessons}
                                    enrollment={enrollment}
                                    onEnrolled={refetchEnrollment}
                                    lessonNavState={lessonNavState}
                                />
                            </div>
                        </div>
                    </div>

                    <CourseCurriculumList
                        course={course}
                        topics={curriculum.topics}
                        enrollment={enrollment}
                        lessonNumbers={lessonNumbers}
                        progressByLesson={progressByLesson}
                        pendingSet={pendingSet}
                        canOpenLessons={canOpenLessons}
                        isStaff={isStaff}
                        lessonNavState={lessonNavState}
                    />

                    <section className="mt-10 rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            {t("courseDetail.reviewsTitle")}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                            {t("courseDetail.reviewsComingSoon")}
                        </p>
                        {user?.role === "student" && isEnrolled ? (
                            canSubmitCourseRating ? (
                                <div className="mt-4">
                                    <StudentCourseRating
                                        courseId={course.id}
                                        onRated={refetchCourseSummary}
                                        emptyCourse={flatLessons.length === 0}
                                    />
                                </div>
                            ) : (
                                <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                                    {t("courseDetail.completeAtLeastOneLesson")}
                                </p>
                            )
                        ) : null}
                    </section>
                </>
            ) : (
                <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {t("courseDetail.noCourseFound")}
                </div>
            )}
        </div>
    );
};
