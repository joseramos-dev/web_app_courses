import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type {
    ISubmission,
    SubmissionStatus,
} from "../../../shared/interfaces/ISubmission";
import { API_getCourseSubmissions } from "../../progress/submissionApi";
import { formatRelativeTime } from "../../dashboard/components/formatRelativeTime";
import { GradeSubmissionModal } from "./GradeSubmissionModal";

const STATUS_CLASS: Record<SubmissionStatus, string> = {
    pending:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    graded:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    returned:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
};

function getStatusLabel(
    t: (key: string) => string,
): Record<SubmissionStatus, string> {
    return {
        pending: t("courseStudents.submissions.status.pending"),
        graded: t("courseStudents.submissions.status.graded"),
        returned: t("courseStudents.submissions.status.returned"),
    };
}

type Props = {
    courseId: number;
};

export function SubmissionsPanel({ courseId }: Props) {
    const { t, i18n } = useTranslation();
    const statusLabel = getStatusLabel(t);
    const [submissions, setSubmissions] = useState<ISubmission[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"pending" | "all">("pending");
    const [gradingSubmission, setGradingSubmission] = useState<ISubmission | null>(
        null,
    );

    const loadSubmissions = useCallback(async () => {
        try {
            setLoading(true);
            const data = await API_getCourseSubmissions(courseId);
            setSubmissions(data.submissions);
            setPendingCount(data.pending_count);
        } catch (e) {
            console.error(e);
            toast.error(t("courseStudents.submissions.loadError"));
            setSubmissions([]);
            setPendingCount(0);
        } finally {
            setLoading(false);
        }
    }, [courseId, t]);

    useEffect(() => {
        void loadSubmissions();
    }, [loadSubmissions]);

    const visibleSubmissions = useMemo(() => {
        if (filter === "all") return submissions;
        return submissions.filter((s) => s.status === "pending");
    }, [filter, submissions]);

    const handleGraded = (updated: ISubmission) => {
        setSubmissions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        setPendingCount((prev) =>
            updated.status === "pending" ? prev : Math.max(0, prev - 1),
        );
    };

    return (
        <section className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-4 py-4 dark:border-slate-600">
                <div>
                    <div className="flex items-center gap-2">
                        <ClipboardList className="size-5 text-gray-500 dark:text-slate-400" />
                        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                            {t("courseStudents.submissions.title")}
                        </h2>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        {t("courseStudents.submissions.intro")}
                        {pendingCount > 0
                            ? t("courseStudents.submissions.pendingSuffix", { count: pendingCount })
                            : t("courseStudents.submissions.noPendingSuffix")}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setFilter("pending")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            filter === "pending"
                                ? "bg-gray-900 text-white dark:bg-uned-primary dark:text-slate-900"
                                : "border border-gray-200 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                    >
                        {t("courseStudents.submissions.filterPending")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter("all")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            filter === "all"
                                ? "bg-gray-900 text-white dark:bg-uned-primary dark:text-slate-900"
                                : "border border-gray-200 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                    >
                        {t("courseStudents.submissions.filterAll")}
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    {t("courseStudents.submissions.loading")}
                </p>
            ) : visibleSubmissions.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    {filter === "pending"
                        ? t("courseStudents.submissions.noPending")
                        : t("courseStudents.submissions.noSubmissions")}
                </p>
            ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.submissions.table.student")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.submissions.table.lesson")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.submissions.table.submitted")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.submissions.table.status")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.submissions.table.score")}
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-slate-300">
                                {t("courseStudents.submissions.table.action")}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {visibleSubmissions.map((submission) => (
                            <tr key={submission.id}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                                    {submission.student_name ?? `#${submission.user_id}`}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                                    {submission.lesson_position != null
                                        ? `#${submission.lesson_position} · `
                                        : ""}
                                    {submission.lesson_title ?? t("courseStudents.submissions.defaultLesson")}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                                    {formatRelativeTime(submission.submitted_at, i18n.language)}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[submission.status]}`}
                                    >
                                        {statusLabel[submission.status]}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                                    {submission.score != null
                                        ? `${submission.score}/${submission.max_score ?? 100}`
                                        : "—"}
                                </td>
                                <td className="px-4 py-3 text-right text-sm">
                                    <button
                                        type="button"
                                        onClick={() => setGradingSubmission(submission)}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                    >
                                        {submission.status === "pending"
                                            ? t("courseStudents.submissions.review")
                                            : t("courseStudents.submissions.viewEdit")}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {gradingSubmission ? (
                <GradeSubmissionModal
                    courseId={courseId}
                    submission={gradingSubmission}
                    isOpen
                    onClose={() => setGradingSubmission(null)}
                    onGraded={handleGraded}
                />
            ) : null}
        </section>
    );
}
