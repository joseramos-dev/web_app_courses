import type { ICourses } from "../../../shared/interfaces/ICourses";
import { difficultyLabels, durationBucketLabels } from "../../../shared/types/CourseTypes";

function formatDuration(durationSeconds: number | null) {
  if (!durationSeconds || durationSeconds <= 0) return "—";
  const totalMinutes = Math.round(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2">
      <div className="text-sm text-gray-500 dark:text-slate-400">{label}</div>
      <div className="text-right text-sm font-medium text-gray-800 dark:text-slate-200">
        {value}
      </div>
    </div>
  );
}

export function DetailInfo({ course }: { course: ICourses }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">
          {course.category}
          {course.subcategory ? ` · ${course.subcategory}` : ""}
        </div>
        <h1 className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">
          {course.title}
        </h1>
        {course.intro ? (
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{course.intro}</p>
        ) : null}
      </div>

      <div className="divide-y divide-gray-200/80 dark:divide-slate-600">
        <InfoRow
          label="Instructor"
          value={
            course.instructor_name
              ? course.instructor_name
              : course.instructor_id === null
                ? "—"
                : `#${course.instructor_id}`
          }
        />
        <InfoRow label="Language" value={course.language} />
        <InfoRow label="Course type" value={course.course_type} />
        <InfoRow
          label="Valoración"
          value={
            course.ratings_count === 0 ? (
              "Sin valoraciones aún"
            ) : (
              <span>
                ⭐{" "}
                {course.rating != null
                  ? Number(course.rating).toFixed(1)
                  : "—"}
                <span className="font-normal text-gray-500 dark:text-slate-400">
                  {" "}
                  ({course.ratings_count}{" "}
                  {course.ratings_count === 1 ? "valoración" : "valoraciones"})
                </span>
              </span>
            )
          }
        />
        <InfoRow
          label="Duración"
          value={
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              <span>{formatDuration(course.duration_seconds)}</span>
              {course.duration_bucket ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                  {durationBucketLabels[course.duration_bucket]}
                </span>
              ) : null}
            </span>
          }
        />
        <InfoRow
          label="Dificultad"
          value={difficultyLabels[course.difficulty]}
        />
        <InfoRow
          label="Site"
          value={
            <a
              className="font-medium text-uned-primary hover:text-uned-primary-hover hover:underline"
              href={course.url}
              target="_blank"
              rel="noreferrer"
            >
              Open course
            </a>
          }
        />
      </div>
    </div>
  );
}

