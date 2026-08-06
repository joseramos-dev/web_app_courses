import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FileText, Trash2 } from "lucide-react";
import type { ILesson, ILessonCreate, ILessonFile, LessonType } from "../lessonTypes";
import {
  API_deleteLessonFile,
  API_getLessonFiles,
  API_uploadLessonFile,
} from "../api";
import { useTranslation } from "react-i18next";
import { QuestionsEditor } from "./QuestionsEditor";
import { getLessonTypeLabels } from "../../../shared/types/LessonTypes";

type Props = {
  isOpen: boolean;
  title: string;
  lesson: ILesson;
  onClose: () => void;
  onSubmit: (payload: ILessonCreate) => void;
  /** Persists a not-yet-saved lesson on the spot (used to unlock the
   * question editor for quizzes before the final "Save lesson" click). */
  onPersistDraft?: (payload: ILessonCreate) => Promise<ILesson>;
};

const lessonTypes: LessonType[] = [
  "text",
  "video",
  "test",
  "multiple_selection",
  "assignment",
];

export function LessonModal({
  isOpen,
  title,
  lesson,
  onClose,
  onSubmit,
  onPersistDraft,
}: Props) {
  const { t } = useTranslation();
  const lessonTypeLabels = getLessonTypeLabels(t);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState<LessonType>("text");
  const [position, setPosition] = useState<number>(lesson.position);
  const [body, setBody] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [maxScore, setMaxScore] = useState<string>("100");
  const [passingScore, setPassingScore] = useState<string>("70");
  const [allowsFileSubmission, setAllowsFileSubmission] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [attachments, setAttachments] = useState<ILessonFile[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isPersistingDraft, setIsPersistingDraft] = useState(false);

  const hasPersistedLesson = lesson.id > 0;

  useEffect(() => {
    if (!isOpen) return;
    setLessonTitle(lesson.title);
    setLessonType(lesson.lesson_type);
    setPosition(lesson.position);
    setBody(lesson.body ?? "");
    setVideoUrl(lesson.video_url ?? "");
    setMaxScore(String(lesson.max_score ?? 100));
    setPassingScore(String(lesson.passing_score ?? 70));
    setAllowsFileSubmission(lesson.allows_file_submission ?? false);
    setShowQuestions(false);
    setAttachments([]);
  }, [lesson, isOpen]);

  useEffect(() => {
    if (!isOpen || !hasPersistedLesson) return;
    const loadFiles = async () => {
      try {
        setAttachmentsLoading(true);
        const data = await API_getLessonFiles(lesson.id);
        setAttachments(data);
      } catch (e) {
        console.error(e);
        toast.error(t("courseEdit.toast.attachmentsLoadFailed"));
      } finally {
        setAttachmentsLoading(false);
      }
    };
    void loadFiles();
  }, [isOpen, hasPersistedLesson, lesson.id]);

  const handleUploadFile = async (file: File) => {
    if (!hasPersistedLesson) return;
    try {
      setUploadingFile(true);
      const uploaded = await API_uploadLessonFile(lesson.id, file);
      setAttachments((prev) => [...prev, uploaded]);
      toast.success(t("courseEdit.toast.fileUploaded"));
    } catch (e) {
      console.error(e);
      toast.error(t("courseEdit.toast.fileUploadFailed"));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm(t("courseEdit.lessonModal.deleteFileConfirm"))) return;
    try {
      await API_deleteLessonFile(fileId);
      setAttachments((prev) => prev.filter((f) => f.id !== fileId));
      toast.success(t("courseEdit.toast.fileDeleted"));
    } catch (e) {
      console.error(e);
      toast.error(t("courseEdit.toast.fileDeleteFailed"));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canSubmit = useMemo(
    () => lessonTitle.trim().length > 0 && Number.isFinite(position),
    [lessonTitle, position],
  );

  const handleSaveAndAddQuestions = async () => {
    if (!canSubmit || !onPersistDraft) return;
    try {
      setIsPersistingDraft(true);
      await onPersistDraft({
        title: lessonTitle.trim(),
        lesson_type: lessonType,
        position,
        body: null,
        video_url: null,
        max_score: null,
        passing_score: null,
        allows_file_submission: false,
      });
      setShowQuestions(true);
    } catch (e) {
      console.error(e);
      toast.error(t("courseEdit.toast.lessonSaveFailed"));
    } finally {
      setIsPersistingDraft(false);
    }
  };

  if (!isOpen) return null;

  const isQuiz =
    lessonType === "test" || lessonType === "multiple_selection";
  const isAssignment = lessonType === "assignment";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-5 lg:max-w-3xl dark:bg-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {t("courseEdit.lessonModal.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {t("courseEdit.close")}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 sm:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              {t("courseEdit.lessonModal.fields.title")}
            </div>
            <input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
            />
          </label>

          <label className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              {t("courseEdit.lessonModal.fields.type")}
            </div>
            <select
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
            >
              {lessonTypes.map((lt) => (
                <option key={lt} value={lt}>
                  {lessonTypeLabels[lt] ?? lt}
                </option>
              ))}
            </select>
          </label>

          {hasPersistedLesson && (
            <label className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                {t("courseEdit.lessonModal.fields.position")}
              </div>
              <input
                value={String(position)}
                onChange={(e) => setPosition(Number(e.target.value))}
                inputMode="numeric"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
              />
            </label>
          )}

          {lessonType === "text" && (
            <label className="flex flex-col gap-2 sm:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                {t("courseEdit.lessonModal.fields.contentMarkdown")}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
              />
            </label>
          )}

          {isAssignment && (
            <>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  {t("courseEdit.lessonModal.fields.assignmentStatement")}
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder={t("courseEdit.lessonModal.assignmentInstructionsPlaceholder")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  {t("courseEdit.lessonModal.fields.maxScore")}
                </div>
                <input
                  type="number"
                  min={1}
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  {t("courseEdit.lessonModal.fields.passingScore")}
                </div>
                <input
                  type="number"
                  min={0}
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={allowsFileSubmission}
                  onChange={(e) => setAllowsFileSubmission(e.target.checked)}
                  className="size-4 rounded border-gray-300 dark:border-slate-600"
                />
                <span className="text-sm text-gray-700 dark:text-slate-200">
                  {t("courseEdit.lessonModal.allowFileSubmission")}
                </span>
              </label>
            </>
          )}

          {lessonType === "video" && (
            <label className="flex flex-col gap-2 sm:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                {t("courseEdit.lessonModal.fields.videoUrl")}
              </div>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={t("courseEdit.lessonModal.videoUrlPlaceholder")}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
              />
            </label>
          )}

          {isQuiz && hasPersistedLesson && (
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowQuestions(true)}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("courseEdit.lessonModal.editQuestions")}
              </button>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {t("courseEdit.lessonModal.questionsInstantSaveHint")}
              </p>
            </div>
          )}

          {isQuiz && !hasPersistedLesson && (
            <div className="sm:col-span-2">
              <button
                type="button"
                disabled={!canSubmit || isPersistingDraft}
                onClick={() => void handleSaveAndAddQuestions()}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {isPersistingDraft ? t("common.saving") : t("courseEdit.lessonModal.saveAndAddQuestions")}
              </button>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {t("courseEdit.lessonModal.saveDraftHint")}
              </p>
            </div>
          )}

          {hasPersistedLesson && (
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                {t("courseEdit.lessonModal.attachmentsTitle")}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {t("courseEdit.lessonModal.attachmentsSubtitle")}
              </p>

              {attachmentsLoading ? (
                <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                  {t("courseEdit.lessonModal.loadingAttachments")}
                </p>
              ) : attachments.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                  {t("courseEdit.lessonModal.noAttachments")}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {attachments.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                    >
                      <FileText
                        className="size-4 shrink-0 text-gray-400 dark:text-slate-500"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-slate-100">
                        {file.original_filename}
                      </span>
                      <span className="shrink-0 text-xs text-gray-500 dark:text-slate-400">
                        {formatFileSize(file.size_bytes)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteFile(file.id)}
                        className="rounded-md p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        aria-label={t("courseEdit.lessonModal.deleteFileAria", {
                          filename: file.original_filename,
                        })}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 has-disabled:cursor-not-allowed has-disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                {uploadingFile ? t("courseEdit.lessonModal.uploading") : t("courseEdit.lessonModal.uploadFile")}
                <input
                  type="file"
                  className="sr-only"
                  disabled={uploadingFile}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleUploadFile(file);
                  }}
                />
              </label>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {t("courseEdit.cancel")}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onSubmit({
                title: lessonTitle.trim(),
                lesson_type: lessonType,
                position,
                body:
                  lessonType === "text" || lessonType === "assignment"
                    ? body
                    : null,
                video_url: lessonType === "video" ? videoUrl.trim() || null : null,
                max_score: isAssignment ? Number(maxScore) || 100 : null,
                passing_score: isAssignment ? Number(passingScore) || 70 : null,
                allows_file_submission: isAssignment ? allowsFileSubmission : false,
              });
            }}
            className="rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent disabled:dark:border-slate-600 disabled:dark:bg-slate-700 disabled:dark:text-slate-500"
          >
            {hasPersistedLesson ? t("courseEdit.lessonModal.saveLesson") : t("courseEdit.lessonModal.createLesson")}
          </button>
        </div>
      </div>

      {showQuestions && (
        <QuestionsEditor
          lessonId={lesson.id}
          onClose={() => setShowQuestions(false)}
        />
      )}
    </div>
  );
}
