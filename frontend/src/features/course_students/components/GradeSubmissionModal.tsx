import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { ISubmission } from "../../../shared/interfaces/ISubmission";
import { API_gradeSubmission } from "../../progress/submissionApi";
import { api } from "../../../shared/api/api";

type Props = {
    courseId: number;
    submission: ISubmission;
    isOpen: boolean;
    onClose: () => void;
    onGraded: (updated: ISubmission) => void;
};

export function GradeSubmissionModal({
    courseId,
    submission,
    isOpen,
    onClose,
    onGraded,
}: Props) {
    const { t } = useTranslation();
    const maxScore = submission.max_score ?? 100;
    const [score, setScore] = useState("");
    const [feedback, setFeedback] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setScore(
            submission.score != null ? String(submission.score) : "",
        );
        setFeedback(submission.feedback ?? "");
    }, [isOpen, submission]);

    if (!isOpen) return null;

    const handleScoreChange = (raw: string) => {
        if (raw === "") {
            setScore("");
            return;
        }
        // Digits with at most one decimal point (scores are floats).
        if (/^\d*\.?\d*$/.test(raw)) {
            setScore(raw);
        }
    };

    const handleDownloadFile = async () => {
        if (!submission.file_id) return;
        try {
            const { data } = await api.get<Blob>(
                `/lessons/files/${submission.file_id}/download`,
                { responseType: "blob" },
            );
            const url = window.URL.createObjectURL(data);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download =
                submission.file_name ?? t("courseStudents.gradeModal.defaultSubmissionFile");
            anchor.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            toast.error(t("courseStudents.gradeModal.downloadFailed"));
        }
    };

    const handleAction = async (action: "grade" | "return") => {
        const scoreNum = score.trim() === "" ? null : Number(score);
        if (action === "grade") {
            if (scoreNum == null || Number.isNaN(scoreNum)) {
                toast.error(t("courseStudents.gradeModal.invalidScore"));
                return;
            }
            if (scoreNum < 0 || scoreNum > maxScore) {
                toast.error(t("courseStudents.gradeModal.scoreRange", { max: maxScore }));
                return;
            }
        }

        try {
            setSubmitting(true);
            const updated = await API_gradeSubmission(courseId, submission.id, {
                score: action === "grade" ? scoreNum : null,
                feedback: feedback.trim() || null,
                action,
            });
            toast.success(
                action === "grade"
                    ? t("courseStudents.gradeModal.gradedSuccess")
                    : t("courseStudents.gradeModal.returnedSuccess"),
            );
            onGraded(updated);
            onClose();
        } catch (e) {
            console.error(e);
            toast.error(t("courseStudents.gradeModal.updateFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-slate-800">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            {t("courseStudents.gradeModal.title")}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                            {submission.student_name ?? t("courseStudents.gradeModal.defaultStudent")} ·{" "}
                            {submission.lesson_title ?? t("courseStudents.gradeModal.defaultLesson")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        {t("common.close")}
                    </button>
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-slate-600 dark:bg-slate-900/50">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                        {t("courseStudents.gradeModal.studentAnswer")}
                    </div>
                    <pre className="mt-2 max-h-40 overflow-y-auto wrap-break-word font-sans whitespace-pre-wrap text-gray-800 dark:text-slate-200">
                        {submission.content}
                    </pre>
                    {submission.file_id ? (
                        <button
                            type="button"
                            onClick={() => void handleDownloadFile()}
                            className="mt-2 inline-block text-xs font-medium text-uned-primary hover:underline dark:text-uned-primary"
                        >
                            {t("courseStudents.gradeModal.downloadFile", {
                                fileName:
                                    submission.file_name ??
                                    t("courseStudents.gradeModal.defaultAttachment"),
                            })}
                        </button>
                    ) : null}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                            {t("courseStudents.gradeModal.scoreLabel", { maxScore })}
                        </span>
                        <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={score}
                            onChange={(e) => handleScoreChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (
                                    e.key.length === 1 &&
                                    !/[\d.]/.test(e.key) &&
                                    !e.ctrlKey &&
                                    !e.metaKey
                                ) {
                                    e.preventDefault();
                                }
                            }}
                            placeholder={t("courseStudents.gradeModal.scorePlaceholder", { maxScore })}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                        />
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                            {t("courseStudents.gradeModal.feedback")}
                        </span>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={4}
                            placeholder={t("courseStudents.gradeModal.feedbackPlaceholder")}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                        />
                    </label>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleAction("return")}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        {t("courseStudents.gradeModal.returnForReview")}
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleAction("grade")}
                        className="rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-60 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent"
                    >
                        {submitting ? t("common.saving") : t("courseStudents.gradeModal.grade")}
                    </button>
                </div>
            </div>
        </div>
    );
}
