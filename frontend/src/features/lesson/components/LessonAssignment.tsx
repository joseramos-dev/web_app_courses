import { useMemo, useState } from "react";
import { FileText, Upload } from "lucide-react";
import toast from "react-hot-toast";
import type { ILesson } from "../../course_edit/lessonTypes";
import type { ISubmission, SubmissionStatus } from "../../../shared/interfaces/ISubmission";
import { api } from "../../../shared/api/api";

const STATUS_LABEL: Record<SubmissionStatus, string> = {
    pending: "Pendiente de corrección",
    graded: "Calificada",
    returned: "Devuelta para revisión",
};

const STATUS_CLASS: Record<SubmissionStatus, string> = {
    pending:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
    graded:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    returned:
        "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200",
};

type Props = {
    lesson: ILesson;
    submission: ISubmission | null;
    submitting: boolean;
    onSubmit: (content: string, file?: File | null) => void;
};

export function LessonAssignment({
    lesson,
    submission,
    submitting,
    onSubmit,
}: Props) {
    const [content, setContent] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const maxScore = lesson.max_score ?? 100;
    const passingScore = lesson.passing_score ?? 70;
    const allowsFile = lesson.allows_file_submission ?? false;

    const canEdit = useMemo(() => {
        if (!submission) return true;
        return submission.status === "returned";
    }, [submission]);

    const handleSubmit = () => {
        if (!content.trim()) return;
        onSubmit(content.trim(), file);
        if (canEdit && submission?.status === "returned") {
            setFile(null);
        }
    };

    const handleDownloadSubmissionFile = async () => {
        if (!submission?.file_id) return;
        try {
            const { data } = await api.get<Blob>(
                `/lessons/files/${submission.file_id}/download`,
                { responseType: "blob" },
            );
            const url = window.URL.createObjectURL(data);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = submission.file_name ?? "entrega";
            anchor.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            toast.error("No se pudo descargar el archivo enviado.");
        }
    };

    return (
        <div className="space-y-4">
            <section className="rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                    <FileText className="size-4" aria-hidden />
                    Enunciado
                </div>
                {lesson.body ? (
                    <pre className="mt-2 wrap-break-word font-sans text-sm leading-6 whitespace-pre-wrap text-gray-800 dark:text-slate-200">
                        {lesson.body}
                    </pre>
                ) : (
                    <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                        El instructor aún no ha añadido instrucciones para esta tarea.
                    </p>
                )}
                <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                    Puntuación máxima: {maxScore} · Nota mínima para aprobar:{" "}
                    {passingScore}
                </p>
            </section>

            {submission ? (
                <div
                    className={`rounded-xl border p-4 text-sm ${STATUS_CLASS[submission.status]}`}
                >
                    <div className="font-semibold">
                        Estado: {STATUS_LABEL[submission.status]}
                    </div>
                    {submission.status === "graded" && submission.score != null ? (
                        <p className="mt-1">
                            Nota: {submission.score}/{maxScore}
                            {submission.score >= passingScore
                                ? " — Aprobada"
                                : " — No alcanza la nota mínima"}
                        </p>
                    ) : null}
                    {submission.feedback ? (
                        <div className="mt-2 rounded-lg border border-current/20 bg-white/40 p-3 dark:bg-slate-900/30">
                            <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                                Comentarios del instructor
                            </div>
                            <p className="mt-1 whitespace-pre-wrap">{submission.feedback}</p>
                        </div>
                    ) : null}
                    {submission.file_id ? (
                        <p className="mt-2 text-xs">
                            Archivo enviado:{" "}
                            <button
                                type="button"
                                onClick={() => void handleDownloadSubmissionFile()}
                                className="font-medium underline"
                            >
                                {submission.file_name ?? "Descargar adjunto"}
                            </button>
                        </p>
                    ) : null}
                </div>
            ) : null}

            {canEdit ? (
                <section className="rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {submission?.status === "returned"
                            ? "Reenviar entrega"
                            : "Tu entrega"}
                    </h2>
                    <label className="mt-3 flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                            Respuesta
                        </span>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={8}
                            placeholder="Escribe tu respuesta o comentarios sobre la tarea…"
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                        />
                    </label>

                    {allowsFile ? (
                        <label className="mt-4 flex flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                                Archivo adjunto (opcional)
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700">
                                    <Upload className="size-4" aria-hidden />
                                    Seleccionar archivo
                                    <input
                                        type="file"
                                        className="sr-only"
                                        onChange={(e) =>
                                            setFile(e.target.files?.[0] ?? null)
                                        }
                                    />
                                </label>
                                {file ? (
                                    <span className="text-sm text-gray-600 dark:text-slate-300">
                                        {file.name}
                                    </span>
                                ) : null}
                            </div>
                        </label>
                    ) : null}

                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            disabled={submitting || !content.trim()}
                            onClick={handleSubmit}
                            className="inline-flex items-center rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent disabled:dark:border-slate-600 disabled:dark:bg-slate-700 disabled:dark:text-slate-500"
                        >
                            {submitting
                                ? "Enviando…"
                                : submission?.status === "returned"
                                  ? "Reenviar entrega"
                                  : "Enviar entrega"}
                        </button>
                    </div>
                </section>
            ) : submission ? (
                <section className="rounded-xl border border-dashed border-gray-300 bg-surface-muted p-4 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {submission.status === "pending"
                        ? "Tu entrega está pendiente de corrección. El instructor te notificará cuando la revise."
                        : "Esta entrega ya ha sido calificada."}
                    {submission.content ? (
                        <pre className="mt-3 wrap-break-word rounded-lg border border-gray-200 bg-white/60 p-3 font-sans text-sm leading-6 whitespace-pre-wrap text-gray-700 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200">
                            {submission.content}
                        </pre>
                    ) : null}
                </section>
            ) : null}
        </div>
    );
}
