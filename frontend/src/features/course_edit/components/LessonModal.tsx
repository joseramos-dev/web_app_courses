import { useEffect, useMemo, useState } from "react";
import type { ILesson, ILessonCreate, LessonType } from "../lessonTypes";
import { QuestionsEditor } from "./QuestionsEditor";

type Props = {
  isOpen: boolean;
  title: string;
  lesson: ILesson;
  onClose: () => void;
  onSubmit: (payload: ILessonCreate) => void;
};

const lessonTypes: LessonType[] = ["text", "video", "test", "multiple_selection"];

export function LessonModal({
  isOpen,
  title,
  lesson,
  onClose,
  onSubmit,
}: Props) {
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState<LessonType>("text");
  const [position, setPosition] = useState<number>(lesson.position);
  const [body, setBody] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [showQuestions, setShowQuestions] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLessonTitle(lesson.title);
    setLessonType(lesson.lesson_type);
    setPosition(lesson.position);
    setBody(lesson.body ?? "");
    setVideoUrl(lesson.video_url ?? "");
    setShowQuestions(false);
  }, [lesson, isOpen]);

  const canSubmit = useMemo(
    () => lessonTitle.trim().length > 0 && Number.isFinite(position),
    [lessonTitle, position],
  );

  if (!isOpen) return null;

  const isQuiz =
    lessonType === "test" || lessonType === "multiple_selection";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl dark:bg-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Title, type, ordering and content.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 sm:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Title
            </div>
            <input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
            />
          </label>

          <label className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Type
            </div>
            <select
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
            >
              {lessonTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Position
            </div>
            <input
              value={String(position)}
              onChange={(e) => setPosition(Number(e.target.value))}
              inputMode="numeric"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
            />
          </label>

          {lessonType === "text" && (
            <label className="flex flex-col gap-2 sm:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                Content (markdown)
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
              />
            </label>
          )}

          {lessonType === "video" && (
            <label className="flex flex-col gap-2 sm:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                Video URL (YouTube / Vimeo)
              </div>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
              />
            </label>
          )}

          {isQuiz && (
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowQuestions(true)}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Editar preguntas
              </button>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Las preguntas se gestionan en su propio editor; los cambios se
                guardan al instante.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
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
                body: lessonType === "text" ? body : null,
                video_url: lessonType === "video" ? videoUrl.trim() || null : null,
              });
            }}
            className="rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent disabled:dark:border-slate-600 disabled:dark:bg-slate-700 disabled:dark:text-slate-500"
          >
            Save lesson
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
