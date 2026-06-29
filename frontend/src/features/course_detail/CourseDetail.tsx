import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CheckCircle2, Circle, PlayCircle, Lock } from "lucide-react";
import {
    API_getCourseDetailById,
    API_getCourseLessons,
    API_getMyEnrollment,
} from "./api";
import type { ICourses } from "../../shared/interfaces/ICourses";
import type { ILesson } from "../course_edit/lessonTypes";
import { lessonTypeLabels } from "../../shared/types/LessonTypes";
import type {
    IEnrollmentDetail,
    ILessonProgress,
    LessonProgressStatus,
} from "../../shared/interfaces/IEnrollment";
import { DetailBackButton } from "./components/DetailBackButton";
import { DetailInfo } from "./components/DetailInfo";
import { DetailActionButton } from "./components/DetailActionButton";
import { StudentCourseRating } from "./components/StudentCourseRating";
import { useAuth } from "../../shared/povider/AuthContext";
import {
    lessonChainState,
    type CourseNavState,
} from "../../shared/types/CourseNavState";
import {
    KURSA_COURSE_ENROLLMENT_CHANGED_EVENT,
    KURSA_DASHBOARD_REFRESH_EVENT,
} from "../../shared/constants/appEvents";

const statusBadgeClass: Record<LessonProgressStatus, string> = {
    completed:
        "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400",
    in_progress:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300",
    not_started:
        "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
};

const statusBadgeLabel: Record<LessonProgressStatus, string> = {
    completed: "Completada",
    in_progress: "En curso",
    not_started: "Sin empezar",
};

function StatusIcon({ status }: { status: LessonProgressStatus }) {
    if (status === "completed")
        return (
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
        );
    if (status === "in_progress")
        return (
            <PlayCircle className="size-4 text-yellow-600 dark:text-yellow-400" />
        );
    return <Circle className="size-4 text-gray-400 dark:text-slate-500" />;
}

export const CourseDetail = () => {
    const { courseId } = useParams();
    const location = useLocation();
    const { user } = useAuth();
    const [course, setCourse] = useState<ICourses | null>(null);
    const [lessons, setLessons] = useState<ILesson[]>([]);
    const [enrollment, setEnrollment] = useState<IEnrollmentDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sortedLessons = useMemo(
        () => [...lessons].sort((a, b) => a.position - b.position),
        [lessons],
    );

    const progressByLesson = useMemo(() => {
        const statusMap = new Map<number, LessonProgressStatus>();
        const detailMap = new Map<number, ILessonProgress>();
        if (enrollment) {
            for (const lp of enrollment.lesson_progress) {
                statusMap.set(lp.lesson_id, lp.status);
                detailMap.set(lp.lesson_id, lp);
            }
        }
        return { statusMap, detailMap };
    }, [enrollment]);

    const refetchEnrollment = useCallback(async () => {
        if (courseId == null || Number.isNaN(Number(courseId))) return;
        if (!user || user.role !== "student") return;
        const id = Number(courseId);
        const enr = await API_getMyEnrollment(id);
        setEnrollment(enr);
        window.dispatchEvent(new Event(KURSA_DASHBOARD_REFRESH_EVENT));
    }, [courseId, user]);

    const refetchCourseSummary = useCallback(async () => {
        if (courseId == null || Number.isNaN(Number(courseId))) return;
        const id = Number(courseId);
        try {
            const detail = await API_getCourseDetailById(id);
            setCourse(detail);
        } catch (e) {
            console.error(e);
        }
    }, [courseId]);

    const fromLessonBump =
        typeof location.state === "object" &&
        location.state !== null &&
        "fromLessonProgress" in location.state
            ? (location.state as CourseNavState).fromLessonProgress
            : undefined;

    const lessonNavState: CourseNavState = lessonChainState(location.state);

    useEffect(() => {
        const fetchCourseDetail = async () => {
            if (courseId == null || Number.isNaN(Number(courseId))) {
                setError("Invalid course.");
                setCourse(null);
                setLessons([]);
                setEnrollment(null);
                return;
            }
            const id = Number(courseId);
            try {
                setIsLoading(true);
                setError(null);
                const enrollmentReq =
                    user && user.role === "student"
                        ? API_getMyEnrollment(id)
                        : Promise.resolve(null);
                const [courseDetail, lessonsList, enr] = await Promise.all([
                    API_getCourseDetailById(id),
                    API_getCourseLessons(id),
                    enrollmentReq,
                ]);
                setCourse(courseDetail);
                setLessons(lessonsList);
                setEnrollment(enr);
            } catch (error) {
                console.error("Error fetching course detail: ", error);
                setError("Could not load course details.");
                setCourse(null);
                setLessons([]);
                setEnrollment(null);
            } finally {
                setIsLoading(false);
            }
        };
        void fetchCourseDetail();
    }, [courseId, user, location.key, location.pathname, fromLessonBump]);

    useEffect(() => {
        const id = courseId != null && !Number.isNaN(Number(courseId)) ? Number(courseId) : null;
        if (id == null) return;
        const onEnrollmentChanged = (e: Event) => {
            const detail = (e as CustomEvent<{ courseId?: number }>).detail;
            if (detail?.courseId === id) {
                void (async () => {
                    try {
                        const enrollmentReq =
                            user && user.role === "student"
                                ? API_getMyEnrollment(id)
                                : Promise.resolve(null);
                        const [courseDetail, lessonsList, enr] = await Promise.all([
                            API_getCourseDetailById(id),
                            API_getCourseLessons(id),
                            enrollmentReq,
                        ]);
                        setCourse(courseDetail);
                        setLessons(lessonsList);
                        setEnrollment(enr);
                    } catch (err) {
                        console.error(err);
                    }
                })();
            }
        };
        window.addEventListener(KURSA_COURSE_ENROLLMENT_CHANGED_EVENT, onEnrollmentChanged);
        return () =>
            window.removeEventListener(
                KURSA_COURSE_ENROLLMENT_CHANGED_EVENT,
                onEnrollmentChanged,
            );
    }, [courseId, user]);

    const isEnrolled = enrollment !== null;
    const progressPercent = enrollment?.progress_percent ?? 0;
    const canSubmitCourseRating =
        isEnrolled &&
        (sortedLessons.length === 0 ||
            (enrollment?.completed_lessons_count ?? 0) >= 1);

    return (
        <div className="mx-auto max-w-4xl px-4 py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <DetailBackButton />
                <DetailActionButton
                    course={course}
                    lessons={lessons}
                    enrollment={enrollment}
                    onEnrolled={refetchEnrollment}
                    lessonNavState={lessonNavState}
                />
            </div>

            {isLoading ? (
                <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Loading course...
                </div>
            ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                </div>
            ) : course ? (
                <>
                    {isEnrolled && (
                        <div className="mb-4 rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span className="font-medium text-gray-800 dark:text-slate-100">
                                    Tu progreso
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                    {enrollment?.status === "completed" ? (
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                            Curso completado
                                        </span>
                                    ) : null}
                                    <span className="text-gray-600 dark:text-slate-400">
                                        {Math.round(progressPercent)}% ·{" "}
                                        {enrollment?.completed_lessons_count ?? 0}/
                                        {sortedLessons.length} lecciones
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
                                <div
                                    className="h-full bg-green-600 transition-all dark:bg-uned-primary"
                                    style={{
                                        width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <DetailInfo course={course} />
                            {user?.role === "student" && isEnrolled ? (
                                canSubmitCourseRating ? (
                                    <StudentCourseRating
                                        courseId={course.id}
                                        onRated={refetchCourseSummary}
                                        emptyCourse={sortedLessons.length === 0}
                                    />
                                ) : (
                                    <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        Completa al menos una lección para poder valorar el curso.
                                    </p>
                                )
                            ) : null}
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                Lessons
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                {sortedLessons.length === 0
                                    ? "This course has no lessons yet."
                                    : `${sortedLessons.length} lesson${sortedLessons.length === 1 ? "" : "s"}`}
                            </p>

                            <div className="mt-3 space-y-2">
                                {sortedLessons.map((l) => {
                                    const status =
                                        progressByLesson.statusMap.get(l.id) ??
                                        "not_started";
                                    const progress =
                                        progressByLesson.detailMap.get(l.id);
                                    const isTestLesson =
                                        l.lesson_type === "test" ||
                                        l.lesson_type === "multiple_selection";
                                    const showTestStats =
                                        isEnrolled &&
                                        isTestLesson &&
                                        progress != null &&
                                        progress.attempts > 0;
                                    const lessonItem = (
                                        <div
                                            className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isEnrolled
                                                ? "border-gray-200/90 bg-white/70 hover:border-gray-300 hover:bg-white dark:border-slate-600 dark:bg-slate-900/50 dark:hover:border-slate-500 dark:hover:bg-slate-900/80"
                                                : "border-gray-200/90 bg-white/50 dark:border-slate-600 dark:bg-slate-900/40"
                                                }`}
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                {isEnrolled ? (
                                                    <StatusIcon status={status} />
                                                ) : (
                                                    <Lock className="size-4 text-gray-400 dark:text-slate-500" />
                                                )}
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-medium text-gray-800 dark:text-slate-100">
                                                        {l.position}. {l.title}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-slate-400">
                                                        {lessonTypeLabels[l.lesson_type] ?? l.lesson_type}
                                                        {showTestStats && progress.best_score != null ? (
                                                            <>
                                                                {" · "}
                                                                Mejor: {Math.round(progress.best_score)}% ·{" "}
                                                                {progress.attempts}{" "}
                                                                {progress.attempts === 1
                                                                    ? "intento"
                                                                    : "intentos"}
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                            {isEnrolled && (
                                                <span
                                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass[status]}`}
                                                >
                                                    {statusBadgeLabel[status]}
                                                </span>
                                            )}
                                        </div>
                                    );

                                    return isEnrolled ? (
                                        <Link
                                            key={l.id}
                                            to={`/course/${course.id}/lesson/${l.id}`}
                                            state={lessonNavState}
                                            className="block"
                                        >
                                            {lessonItem}
                                        </Link>
                                    ) : (
                                        <div key={l.id}>{lessonItem}</div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    No course found.
                </div>
            )}
        </div>
    );
};
