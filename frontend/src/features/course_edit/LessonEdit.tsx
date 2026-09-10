import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FileText, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ILesson, LessonType } from "./lessonTypes";
import { getLessonFileDownloadUrl } from "./api";
import { API_getLesson } from "../lesson/api";
import { useAsyncData } from "../../shared/hooks/useAsyncData";
import { ExistingQuestionsPanel } from "./components/ExistingQuestionsPanel";
import { QuestionFormModal } from "./components/QuestionFormModal";
import { getLessonTypeLabels } from "../../shared/types/LessonTypes";
import { MarkdownEditor } from "../../shared/components/markdown/MarkdownEditor";
import { ACCEPTED_UPLOAD_TYPES, MAX_UPLOAD_MB } from "../../shared/constants/uploads";
import { useLessonForm } from "./hooks/useLessonForm";
import { useLessonAttachmentsEditor } from "./hooks/useLessonAttachmentsEditor";
import { useQuestionModal } from "./hooks/useQuestionModal";
import { formatFileSize } from "../../shared/utils/formatFileSize";

const lessonTypes: LessonType[] = [
  "text",
  "video",
  "test",
  "multiple_selection",
  "assignment",
];

function PassingScoreSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-xs font-semibold uppercase text-gray-400">{label}</span>
        <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-800 dark:text-slate-100">
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-uned-accent"
      />
      <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500">
        <span>0</span>
        <span>100</span>
      </div>
    </label>
  );
}

export function LessonEdit() {
  const { t } = useTranslation();
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const lessonTypeLabels = getLessonTypeLabels(t);

  const { data: lesson, loading: isLoading, error } = useAsyncData<ILesson | null>(
    () => {
      const id = Number(lessonId);
      if (Number.isNaN(id)) return Promise.resolve(null);
      return API_getLesson(id);
    },
    [lessonId],
    { errorMessage: t("courseEdit.loadError") },
  );

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const form = useLessonForm(lesson);
  const attachmentsEditor = useLessonAttachmentsEditor(lessonId);
  const questionModal = useQuestionModal();

  if (isLoading || attachmentsEditor.isLoading || !lesson) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-gray-600 dark:text-slate-300">
        {t("courseEdit.loadingEditor")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(`/course/${courseId}/edit`)}
          className="rounded-lg border px-3 py-2 text-sm font-semibold"
        >
          {t("courseEdit.back")}
        </button>
        <button
          type="button"
          disabled={!form.canSubmit || form.isSaving}
          onClick={() => void form.handleSave()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-uned-primary dark:text-slate-900"
        >
          {form.isSaving ? t("common.saving") : t("courseEdit.save")}
        </button>
      </div>

      <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
        {t("courseEdit.lessonEdit.title")}
      </h1>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-xs font-semibold uppercase text-gray-400">
            {t("courseEdit.lessonModal.fields.title")}
          </span>
          <input
            value={form.lessonTitle}
            onChange={(e) => form.setLessonTitle(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-gray-400">
            {t("courseEdit.lessonModal.fields.type")}
          </span>
          <select
            value={form.lessonType}
            onChange={(e) => form.setLessonType(e.target.value as LessonType)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-uned-primary focus:outline-none focus:ring-2 focus:ring-uned-primary/25 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-uned-primary"
          >
            {lessonTypes.map((lt) => (
              <option key={lt} value={lt}>
                {lessonTypeLabels[lt]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-gray-400">
            {t("courseEdit.lessonModal.fields.durationMinutes")}
          </span>
          <input
            value={form.durationMinutes}
            onChange={(e) => form.setDurationMinutes(e.target.value)}
            inputMode="numeric"
            min={0}
            placeholder={t("courseEdit.lessonModal.fields.durationPlaceholder")}
            className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {t("courseEdit.lessonModal.fields.durationHint")}
          </span>
        </label>

        {form.lessonType === "text" && (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase text-gray-400">
              {t("courseEdit.lessonModal.fields.contentMarkdown")}
            </span>
            <MarkdownEditor
              value={form.body}
              onChange={form.setBody}
              attachments={attachmentsEditor.attachments.map((f) => ({
                id: f.id,
                label: f.original_filename,
                url: getLessonFileDownloadUrl(f.id),
              }))}
            />
          </div>
        )}

        {form.isAssignment && (
          <>
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-400">
                {t("courseEdit.lessonModal.fields.assignmentStatement")}
              </span>
              <textarea
                value={form.body}
                onChange={(e) => form.setBody(e.target.value)}
                rows={8}
                className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-gray-400">
                {t("courseEdit.lessonModal.fields.maxScore")}
              </span>
              <input
                type="number"
                value={form.maxScore}
                onChange={(e) => form.setMaxScore(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <PassingScoreSlider
              value={form.passingScore}
              onChange={form.setPassingScore}
              label={t("courseEdit.lessonModal.fields.passingScore")}
            />
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.allowsFileSubmission}
                onChange={(e) => form.setAllowsFileSubmission(e.target.checked)}
              />
              <span className="text-sm">{t("courseEdit.lessonModal.allowFileSubmission")}</span>
            </label>
          </>
        )}

        {form.lessonType === "video" && (
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase text-gray-400">
              {t("courseEdit.lessonModal.fields.videoUrl")}
            </span>
            <input
              value={form.videoUrl}
              onChange={(e) => form.setVideoUrl(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
          </label>
        )}

        {form.isQuiz && (
          <>
            <PassingScoreSlider
              value={form.passingScore}
              onChange={form.setPassingScore}
              label={t("courseEdit.lessonModal.fields.passingScore")}
            />
            <ExistingQuestionsPanel
              lessonId={lesson.id}
              refreshKey={questionModal.refreshKey}
              highlightedQuestionId={questionModal.editingQuestion?.id ?? null}
              onAdd={questionModal.openForAdd}
              onEdit={questionModal.openForEdit}
              onDeleted={questionModal.handleDeleted}
            />
          </>
        )}

        <div className="sm:col-span-2">
          <div className="text-xs font-semibold uppercase text-gray-400">
            {t("courseEdit.lessonModal.attachmentsTitle")}
          </div>
          {attachmentsEditor.isLoading ? (
            <p className="mt-2 text-sm text-gray-500">{t("courseEdit.lessonModal.loadingAttachments")}</p>
          ) : attachmentsEditor.attachments.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">{t("courseEdit.lessonModal.noAttachments")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {attachmentsEditor.attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 rounded border px-3 py-2 dark:border-slate-600"
                >
                  <FileText className="size-4" />
                  <span className="min-w-0 flex-1 truncate text-sm">{file.original_filename}</span>
                  <span className="text-xs text-gray-500">{formatFileSize(file.size_bytes)}</span>
                  <button type="button" onClick={() => void attachmentsEditor.handleDeleteFile(file.id)}>
                    <Trash2 className="size-4 text-red-600" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-3 inline-flex cursor-pointer rounded border px-3 py-2 text-sm font-semibold">
            {attachmentsEditor.uploadingFile
              ? t("courseEdit.lessonModal.uploading")
              : t("courseEdit.lessonModal.uploadFile")}
            <input
              type="file"
              className="sr-only"
              accept={ACCEPTED_UPLOAD_TYPES}
              disabled={attachmentsEditor.uploadingFile}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void attachmentsEditor.handleUploadFile(file);
              }}
            />
          </label>
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            {t("courseEdit.lessonModal.uploadHint", { max: MAX_UPLOAD_MB })}
          </p>
        </div>
      </div>

      {questionModal.isOpen && (
        <QuestionFormModal
          lessonId={lesson.id}
          lessonType={form.lessonType}
          question={questionModal.editingQuestion}
          onClose={questionModal.close}
          onSaved={questionModal.handleSaved}
        />
      )}
    </div>
  );
}
