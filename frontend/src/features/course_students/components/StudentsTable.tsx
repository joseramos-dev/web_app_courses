import { Fragment, useCallback, useState } from "react";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type {
    IInstructorStudentDetail,
    IInstructorStudentRow,
} from "../../../shared/interfaces/IInstructorCourseStudents";
import type {
    EnrollmentStatus,
    LessonProgressStatus,
} from "../../../shared/interfaces/IEnrollment";
import { CourseProgressChart } from "../../../shared/components/charts/CourseProgressChart";
import { formatRelativeTime } from "../../dashboard/components/formatRelativeTime";
import { API_getStudentDetail } from "../api";

const ENROLLMENT_STATUS_CLASS: Record<EnrollmentStatus, string> = {
    in_progress:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    completed:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    dropped: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
};

function getEnrollmentStatusLabel(
    t: (key: string) => string,
): Record<EnrollmentStatus, string> {
    return {
        in_progress: t("courseStudents.enrollmentStatus.in_progress"),
        completed: t("courseStudents.enrollmentStatus.completed"),
        dropped: t("courseStudents.enrollmentStatus.dropped"),
    };
}

function getLessonStatusLabel(
    t: (key: string) => string,
): Record<LessonProgressStatus, string> {
    return {
        not_started: t("courseStudents.lessonStatus.not_started"),
        in_progress: t("courseStudents.lessonStatus.in_progress"),
        completed: t("courseStudents.lessonStatus.completed"),
    };
}

function LessonStatusIcon({ status }: { status: LessonProgressStatus }) {
    if (status === "completed")
        return <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />;
    if (status === "in_progress")
        return <PlayCircle className="size-4 text-amber-600 dark:text-amber-400" />;
    return <Circle className="size-4 text-gray-400 dark:text-slate-500" />;
}

function StudentLessonDetail({ detail }: { detail: IInstructorStudentDetail }) {
    const { t, i18n } = useTranslation();
    const lessonStatusLabel = getLessonStatusLabel(t);

    return (
        <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {detail.lesson_progress.map((lp) => (
                <li
                    key={lp.lesson_id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <LessonStatusIcon status={lp.status} />
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                            {lp.lesson_title}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                            #{lp.position}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                        <span>{lessonStatusLabel[lp.status]}</span>
                        {(lp.lesson_type === "test" ||
                            lp.lesson_type === "multiple_selection") &&
                        lp.attempts > 0 ? (
                            <span>
                                {t("courseStudents.score")}:{" "}
                                {lp.best_score != null
                                    ? `${Math.round(lp.best_score)}%`
                                    : "—"}{" "}
                                · {t("courseStudents.attemptCount", { count: lp.attempts })}
                            </span>
                        ) : null}
                        {lp.completed_at ? (
                            <span>
                                {t("courseStudents.completedAgo", {
                                    time: formatRelativeTime(lp.completed_at, i18n.language),
                                })}
                            </span>
                        ) : null}
                    </div>
                </li>
            ))}
        </ul>
    );
}

type Props = {
    courseId: number;
    students: IInstructorStudentRow[];
};

export function StudentsTable({ courseId, students }: Props) {
    const { t, i18n } = useTranslation();
    const enrollmentStatusLabel = getEnrollmentStatusLabel(t);

    const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
    const [detailByUser, setDetailByUser] = useState<
        Record<number, IInstructorStudentDetail>
    >({});
    const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);

    const toggleStudent = useCallback(
        async (userId: number) => {
            if (expandedUserId === userId) {
                setExpandedUserId(null);
                return;
            }
            setExpandedUserId(userId);
            if (detailByUser[userId]) return;

            try {
                setLoadingDetailId(userId);
                const detail = await API_getStudentDetail(courseId, userId);
                setDetailByUser((prev) => ({ ...prev, [userId]: detail }));
            } catch (e) {
                console.error(e);
                toast.error(t("courseStudents.loadDetailError"));
                setExpandedUserId(null);
            } finally {
                setLoadingDetailId(null);
            }
        },
        [courseId, detailByUser, expandedUserId, t],
    );

    return (
        <section className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
            {students.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    {t("courseStudents.noStudents")}
                </p>
            ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.table.student")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.table.status")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.table.progress")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.table.lessons")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.table.lastActivity")}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {students.map((student) => {
                            const isExpanded = expandedUserId === student.user_id;
                            const detail = detailByUser[student.user_id];
                            return (
                                <Fragment key={student.user_id}>
                                    <tr
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40"
                                        onClick={() => void toggleStudent(student.user_id)}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                                            {student.student_name}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ENROLLMENT_STATUS_CLASS[student.status]}`}
                                            >
                                                {enrollmentStatusLabel[student.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="w-36">
                                                <CourseProgressChart
                                                    value={student.progress_percent}
                                                    rightLabel={`${Math.round(student.progress_percent)}%`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                                            {student.completed_lessons_count}/
                                            {student.total_lessons}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                                            {formatRelativeTime(student.last_activity_at, i18n.language)}
                                        </td>
                                    </tr>
                                    {isExpanded ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="bg-gray-50 px-4 py-4 dark:bg-slate-900/50"
                                            >
                                                {loadingDetailId === student.user_id ? (
                                                    <p className="text-sm text-gray-500 dark:text-slate-400">
                                                        {t("courseStudents.loadingLessons")}
                                                    </p>
                                                ) : detail ? (
                                                    <StudentLessonDetail detail={detail} />
                                                ) : null}
                                            </td>
                                        </tr>
                                    ) : null}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </section>
    );
}
