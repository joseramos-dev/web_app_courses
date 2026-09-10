import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ICourseCurriculum, ILesson, ILessonCreate, ITopicWithLessons } from "../lessonTypes";
import { getLessonTypeLabels } from "../../../shared/types/LessonTypes";
import { formatDuration } from "../../../shared/utils/formatDuration";

type Props = {
  courseId: number;
  curriculum: ICourseCurriculum;
  disabled?: boolean;
  onCreateLesson: (payload: ILessonCreate) => Promise<ILesson>;
  onDeleteLesson: (lessonId: number) => Promise<void>;
  onCreateTopic: (name: string) => Promise<void>;
  onUpdateTopic: (topicId: number, name: string) => Promise<void>;
  onDeleteTopic: (topicId: number) => Promise<void>;
  onReorderTopics: (orderedTopicIds: number[]) => Promise<void>;
  onReorderLessons: (topicId: number, orderedLessonIds: number[]) => Promise<void>;
  onCurriculumChange: (next: ICourseCurriculum) => void;
};

export function TopicsEditor({
  courseId,
  curriculum,
  disabled,
  onCreateLesson,
  onDeleteLesson,
  onCreateTopic,
  onUpdateTopic,
  onDeleteTopic,
  onReorderTopics,
  onReorderLessons,
  onCurriculumChange,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lessonTypeLabels = getLessonTypeLabels(t);
  const [newTopicName, setNewTopicName] = useState("");
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editingTopicName, setEditingTopicName] = useState("");

  const sortedTopics = useMemo(
    () => [...curriculum.topics].sort((a, b) => a.position - b.position),
    [curriculum.topics],
  );

  const addTopic = async () => {
    const name = newTopicName.trim();
    if (!name) return;
    await onCreateTopic(name);
    setNewTopicName("");
    toast.success(t("courseEdit.toast.topicCreated"));
  };

  const addLesson = async (topic: ITopicWithLessons) => {
    const lessons = [...topic.lessons].sort((a, b) => a.position - b.position);
    const nextPos = lessons.length === 0 ? 1 : Math.max(...lessons.map((l) => l.position)) + 1;
    const created = await onCreateLesson({
      title: t("courseEdit.topics.newLessonTitle"),
      lesson_type: "text",
      topic_id: topic.id,
      position: nextPos,
    });
    toast.success(t("courseEdit.toast.lessonCreated"));
    navigate(`/course/${courseId}/lesson/${created.id}/edit`);
  };

  const moveTopic = async (topicId: number, dir: -1 | 1) => {
    const ids = sortedTopics.map((tpc) => tpc.id);
    const idx = ids.indexOf(topicId);
    const swap = idx + dir;
    if (swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    await onReorderTopics(ids);
  };

  const moveLesson = async (topic: ITopicWithLessons, lessonId: number, dir: -1 | 1) => {
    const lessons = [...topic.lessons].sort((a, b) => a.position - b.position);
    const ids = lessons.map((l) => l.id);
    const idx = ids.indexOf(lessonId);
    const swap = idx + dir;
    if (swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    await onReorderLessons(topic.id, ids);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {t("courseEdit.topics.title")}
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            {t("courseEdit.topics.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={newTopicName}
            disabled={disabled}
            onChange={(e) => setNewTopicName(e.target.value)}
            placeholder={t("courseEdit.topics.newTopicPlaceholder")}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            disabled={disabled || !newTopicName.trim()}
            onClick={() => void addTopic()}
            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
          >
            {t("courseEdit.topics.addTopic")}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {sortedTopics.map((topic, topicIdx) => (
          <div
            key={topic.id}
            className="rounded-lg border border-gray-200 bg-white/70 p-3 dark:border-slate-600 dark:bg-slate-900/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              {editingTopicId === topic.id ? (
                <input
                  value={editingTopicName}
                  onChange={(e) => setEditingTopicName(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
              ) : (
                <h3 className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {topic.name}
                  {formatDuration(topic.duration_seconds) ? (
                    <span className="text-xs font-normal text-gray-500 dark:text-slate-400">
                      {formatDuration(topic.duration_seconds)}
                    </span>
                  ) : null}
                </h3>
              )}
              <div className="flex flex-wrap gap-1">
                {editingTopicId === topic.id ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      void (async () => {
                        await onUpdateTopic(topic.id, editingTopicName.trim());
                        setEditingTopicId(null);
                        toast.success(t("courseEdit.toast.topicUpdated"));
                      })()
                    }
                    className="rounded border px-2 py-1 text-xs font-semibold"
                  >
                    {t("courseEdit.save")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setEditingTopicId(topic.id);
                      setEditingTopicName(topic.name);
                    }}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    {t("courseEdit.topics.rename")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={disabled || topicIdx === 0}
                  onClick={() => void moveTopic(topic.id, -1)}
                  className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={disabled || topicIdx === sortedTopics.length - 1}
                  onClick={() => void moveTopic(topic.id, 1)}
                  className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={disabled || topic.lessons.length > 0}
                  title={
                    topic.lessons.length > 0
                      ? t("courseEdit.topics.deleteTopicBlocked")
                      : undefined
                  }
                  onClick={() =>
                    void (async () => {
                      if (!window.confirm(t("courseEdit.topics.deleteTopicConfirm"))) return;
                      await onDeleteTopic(topic.id);
                      toast.success(t("courseEdit.toast.topicDeleted"));
                    })()
                  }
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 disabled:opacity-40 dark:border-red-900 dark:text-red-400"
                >
                  {t("courseEdit.topics.deleteTopic")}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void addLesson(topic)}
                  className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white"
                >
                  {t("courseEdit.lessons.addLesson")}
                </button>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {[...topic.lessons]
                .sort((a, b) => a.position - b.position)
                .map((lesson, lessonIdx) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-2 dark:border-slate-700"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{lesson.title}</div>
                      <div className="text-xs text-gray-500">
                        {lessonTypeLabels[lesson.lesson_type]}
                        {formatDuration(lesson.duration_seconds)
                          ? ` · ${formatDuration(lesson.duration_seconds)}`
                          : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={disabled || lessonIdx === 0}
                        onClick={() => void moveLesson(topic, lesson.id, -1)}
                        className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={disabled || lessonIdx === topic.lessons.length - 1}
                        onClick={() => void moveLesson(topic, lesson.id, 1)}
                        className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          navigate(`/course/${courseId}/lesson/${lesson.id}/edit`)
                        }
                        className="rounded border px-2 py-1 text-xs font-semibold"
                      >
                        {t("courseEdit.edit")}
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          void (async () => {
                            if (
                              !window.confirm(
                                t("courseEdit.lessons.deleteConfirm", {
                                  title: lesson.title,
                                }),
                              )
                            )
                              return;
                            await onDeleteLesson(lesson.id);
                            onCurriculumChange({
                              topics: curriculum.topics.map((tpc) =>
                                tpc.id === topic.id
                                  ? {
                                      ...tpc,
                                      lessons: tpc.lessons.filter((l) => l.id !== lesson.id),
                                    }
                                  : tpc,
                              ),
                            });
                            toast.success(t("courseEdit.toast.lessonDeleted"));
                          })()
                        }
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
