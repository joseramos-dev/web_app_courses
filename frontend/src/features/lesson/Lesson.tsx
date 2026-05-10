import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { ChevronLeft } from "lucide-react";
import {
    API_completeLesson,
    API_getCourseLessonsForNav,
    API_getLesson,
    API_getLessonQuestions,
    API_startLesson,
    type ILessonAnswer,
} from "./api";
import { LessonText } from "./components/LessonText";
import { LessonVideo } from "./components/LessonVideo";
import { LessonQuiz } from "./components/LessonQuiz";
import type { ILesson, IQuestionPublic } from "../course_edit/lessonTypes";
import {
    KURSA_COURSE_ENROLLMENT_CHANGED_EVENT,
    KURSA_DASHBOARD_REFRESH_EVENT,
} from "../../shared/constants/appEvents";
import {
    lessonChainState,
    resolveReturnTo,
} from "../../shared/types/CourseNavState";

export const Lesson = () => {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [lesson, setLesson] = useState<ILesson | null>(null);
    const [siblings, setSiblings] = useState<ILesson[]>([]);
    const [questions, setQuestions] = useState<IQuestionPublic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [lastScore, setLastScore] = useState<number | null>(null);

    const courseIdNum = Number(courseId);
    const lessonIdNum = Number(lessonId);

    const nextLessonId = useMemo(() => {
        if (!lesson || siblings.length === 0) return null;
        const sorted = [...siblings].sort((a, b) => a.position - b.position);
        const idx = sorted.findIndex((l) => l.id === lesson.id);
        if (idx === -1) return null;
        const next = sorted[idx + 1];
        return next ? next.id : null;
    }, [lesson, siblings]);

    useEffect(() => {
        const fetchAll = async () => {
            if (
                Number.isNaN(courseIdNum) ||
                Number.isNaN(lessonIdNum)
            ) {
                setError("Lección no válida.");
                return;
            }
            try {
                setIsLoading(true);
                setError(null);

                const lessonReq = API_getLesson(lessonIdNum);
                const navReq = API_getCourseLessonsForNav(courseIdNum);
                const startReq = API_startLesson(lessonIdNum);
                const [lessonData, navData] = await Promise.all([
                    lessonReq,
                    navReq,
                ]);
                setLesson(lessonData);
                setSiblings(navData);

                try {
                    await startReq;
                } catch (e) {
                    if (
                        axios.isAxiosError(e) &&
                        (e.response?.status === 403 || e.response?.status === 404)
                    ) {
                        toast.error("Necesitas matricularte para acceder a esta lección.");
                        navigate(`/course/${courseIdNum}`, {
                            state: lessonChainState(location.state),
                        });
                        return;
                    }
                    throw e;
                }

                if (
                    lessonData.lesson_type === "test" ||
                    lessonData.lesson_type === "multiple_selection"
                ) {
                    const qs = await API_getLessonQuestions(lessonIdNum);
                    setQuestions(qs);
                }
            } catch (e) {
                console.error(e);
                if (axios.isAxiosError(e) && e.response?.status === 403) {
                    toast.error("No puedes acceder a esta lección.");
                    navigate(`/course/${courseIdNum}`, {
                        state: lessonChainState(location.state),
                    });
                    return;
                }
                setError("No se pudo cargar la lección.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, [courseIdNum, lessonIdNum, navigate]);

    const handleAfterPass = (enrollmentCompleted: boolean) => {
        window.dispatchEvent(new Event(KURSA_DASHBOARD_REFRESH_EVENT));
        window.dispatchEvent(
            new CustomEvent(KURSA_COURSE_ENROLLMENT_CHANGED_EVENT, {
                detail: { courseId: courseIdNum },
            }),
        );
        if (nextLessonId !== null) {
            toast.success("Lección superada!");
            navigate(`/course/${courseIdNum}/lesson/${nextLessonId}`, {
                state: lessonChainState(location.state),
            });
            return;
        }
        if (enrollmentCompleted) {
            toast.success("¡Curso completado!");
        } else {
            toast.success("Lección superada!");
        }
        navigate(`/course/${courseIdNum}`, {
            state: {
                returnTo: resolveReturnTo(location.state),
                fromLessonProgress: Date.now(),
            },
        });
    };

    const handleMarkComplete = async () => {
        if (!lesson) return;
        try {
            setSubmitting(true);
            const result = await API_completeLesson(lesson.id);
            handleAfterPass(result.enrollment_completed);
        } catch (e) {
            console.error(e);
            toast.error("No se pudo marcar la lección como completada.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleQuizSubmit = async (answers: ILessonAnswer[]) => {
        if (!lesson) return;
        try {
            setSubmitting(true);
            const result = await API_completeLesson(lesson.id, answers);
            setLastScore(result.score);
            if (result.passed) {
                handleAfterPass(result.enrollment_completed);
            } else {
                toast.error(
                    `No has alcanzado el 70% (puntuación: ${Math.round(
                        result.score ?? 0,
                    )}%). Inténtalo de nuevo.`,
                );
            }
        } catch (e) {
            console.error(e);
            toast.error("No se pudieron enviar las respuestas.");
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-6">
                <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Cargando lección...
                </div>
            </div>
        );
    }

    if (error || !lesson) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    {error ?? "Lección no encontrada."}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="mb-4">
                <button
                    type="button"
                    onClick={() =>
                        navigate(`/course/${courseIdNum}`, {
                            replace: true,
                            state: lessonChainState(location.state),
                        })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:shadow-md dark:hover:bg-slate-700"
                >
                    <ChevronLeft className="size-4" aria-hidden />
                    Volver al curso
                </button>
            </div>

            <header className="mb-4">
                <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">
                    Lección {lesson.position} ·{" "}
                    {lesson.lesson_type.replace("_", " ")}
                </div>
                <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">
                    {lesson.title}
                </h1>
            </header>

            <div className="mb-6">
                {lesson.lesson_type === "text" && (
                    <LessonText body={lesson.body} />
                )}
                {lesson.lesson_type === "video" && (
                    <LessonVideo videoUrl={lesson.video_url} />
                )}
                {(lesson.lesson_type === "test" ||
                    lesson.lesson_type === "multiple_selection") && (
                        <LessonQuiz
                            questions={questions}
                            mode={
                                lesson.lesson_type === "test" ? "single" : "multiple"
                            }
                            submitting={submitting}
                            onSubmit={handleQuizSubmit}
                            lastScore={lastScore}
                        />
                    )}
            </div>

            {(lesson.lesson_type === "text" || lesson.lesson_type === "video") && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleMarkComplete}
                        disabled={submitting}
                        className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:bg-green-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
                    >
                        {submitting ? "Marcando…" : "Marcar como completada"}
                    </button>
                </div>
            )}
        </div>
    );
};
