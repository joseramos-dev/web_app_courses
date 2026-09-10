import { useTranslation } from "react-i18next";
import type { ICourses } from "../../../shared/interfaces/ICourses";
import type { ICourseEditStats } from "../api";
import { formatDuration } from "../../../shared/utils/formatDuration";
import { formatDateTime } from "../../../shared/utils/formatDateTime";

type Props = {
  isCreateMode: boolean;
  draft: ICourses;
  course: ICourses | null;
  stats: ICourseEditStats | null;
  canEdit: boolean;
  isDeleting: boolean;
  onChange: (next: ICourses) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
};

export function CourseEditSidebar({
  isCreateMode,
  draft,
  course,
  stats,
  canEdit,
  isDeleting,
  onChange,
  onSave,
  onDelete,
}: Props) {
  const { t, i18n } = useTranslation();

  if (!isCreateMode && stats) {
    return (
      <div className="lg:col-span-1">
        <div className="sticky top-4 space-y-4 rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={!canEdit}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-uned-primary dark:text-slate-900"
          >
            {t("courseEdit.save")}
          </button>

          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase text-gray-400">{t("courseEdit.sidebar.enrollments")}</dt>
              <dd className="font-medium">{stats.enrollments_count}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-400">{t("courseEdit.sidebar.lastEdit")}</dt>
              <dd className="font-medium">
                {formatDateTime(course?.updated_at, i18n.language) ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-400">{t("courseEdit.sidebar.topics")}</dt>
              <dd className="font-medium">{stats.topics_count}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-400">{t("courseEdit.sidebar.lessons")}</dt>
              <dd className="font-medium">{stats.lessons_count}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-400">{t("courseEdit.sidebar.duration")}</dt>
              <dd className="font-medium">
                {formatDuration(stats.duration_seconds) ?? "—"}
              </dd>
            </div>
          </dl>

          <label className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm dark:border-slate-600">
            <span>{t("courseEdit.sidebar.publicCourse")}</span>
            <input
              type="checkbox"
              checked={draft.is_public !== false}
              disabled={!canEdit}
              onChange={(e) =>
                onChange({ ...draft, is_public: e.target.checked })
              }
            />
          </label>

          <fieldset className="space-y-2 rounded-lg border px-3 py-2 text-sm dark:border-slate-600">
            <legend className="text-xs font-semibold uppercase text-gray-400">
              {t("courseEdit.sidebar.lessonAccessMode")}
            </legend>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="lesson_access_mode"
                value="open"
                checked={(draft.lesson_access_mode ?? "open") === "open"}
                disabled={!canEdit}
                onChange={() =>
                  onChange({ ...draft, lesson_access_mode: "open" })
                }
              />
              <span>{t("courseEdit.sidebar.lessonAccessOpen")}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="lesson_access_mode"
                value="progressive"
                checked={draft.lesson_access_mode === "progressive"}
                disabled={!canEdit}
                onChange={() =>
                  onChange({ ...draft, lesson_access_mode: "progressive" })
                }
              />
              <span>{t("courseEdit.sidebar.lessonAccessProgressive")}</span>
            </label>
          </fieldset>

          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={isDeleting || !canEdit}
            className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
          >
            {isDeleting ? t("courseEdit.deleting") : t("courseEdit.deleteCourse")}
          </button>
        </div>
      </div>
    );
  }

  if (isCreateMode) {
    return (
      <div className="lg:col-span-1">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!draft.title.trim()}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-uned-primary dark:text-slate-900"
        >
          {t("courseEdit.createCourse")}
        </button>
      </div>
    );
  }

  return null;
}
