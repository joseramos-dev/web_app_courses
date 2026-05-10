import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import type { ILesson, ILessonCreate } from "../lessonTypes";
import { LessonModal } from "./LessonModal";

type Props = {
  courseId: number;
  lessons: ILesson[];
  disabled?: boolean;
  onUpdate: (lessonId: number, payload: ILessonCreate) => Promise<void> | void;
  onDelete: (lessonId: number) => Promise<void> | void;
  onReorder: (orderedLessonIds: number[]) => Promise<void> | void;
};

export function LessonsEditor({
  courseId,
  lessons,
  disabled,
  onUpdate,
  onDelete,
  onReorder,
}: Props) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ILesson | null>(null);

  const sorted = useMemo(
    () => [...lessons].sort((a, b) => a.position - b.position),
    [lessons],
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Lessons</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Create, edit, delete, and reorder lessons for this course.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => navigate(`/course/${courseId}/edit/lesson/new`)}
          className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
        >
          Add lesson
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-900/30 dark:text-slate-300">
          No lessons yet — add the first lesson.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {sorted.map((l, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === sorted.length - 1;
            return (
              <div
                key={l.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-200/90 bg-white/70 px-3 py-2 dark:border-slate-600 dark:bg-slate-900/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {l.position}. {l.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{l.lesson_type}</div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={disabled || isFirst}
                    onClick={() => {
                      const ordered = sorted.map((x) => x.id);
                      const next = [...ordered];
                      const i = ordered.indexOf(l.id);
                      if (i <= 0) return;
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      onReorder(next);
                    }}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:dark:bg-slate-800/50 disabled:dark:text-slate-600"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={disabled || isLast}
                    onClick={() => {
                      const ordered = sorted.map((x) => x.id);
                      const next = [...ordered];
                      const i = ordered.indexOf(l.id);
                      if (i < 0 || i >= next.length - 1) return;
                      [next[i], next[i + 1]] = [next[i + 1], next[i]];
                      onReorder(next);
                    }}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:dark:bg-slate-800/50 disabled:dark:text-slate-600"
                  >
                    Down
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setEditing(l);
                      setIsModalOpen(true);
                    }}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:dark:bg-slate-800/50 disabled:dark:text-slate-600"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (!confirm(`Delete "${l.title}"?`)) return;
                      onDelete(l.id);
                    }}
                    className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <LessonModal
          isOpen={isModalOpen}
          title="Edit lesson"
          lesson={editing}
          onClose={() => {
            setIsModalOpen(false);
            setEditing(null);
          }}
          onSubmit={async (payload) => {
            try {
              await onUpdate(editing.id, payload);
              setIsModalOpen(false);
              setEditing(null);
            } catch (e) {
              console.error(e);
              toast.error("Could not save lesson.");
            }
          }}
        />
      )}
    </div>
  );
}

