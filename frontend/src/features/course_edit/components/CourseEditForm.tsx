import { useEffect, useMemo, useState } from "react";
import type { ICourses } from "../../../shared/interfaces/ICourses";
import type { IUser } from "../../../shared/interfaces/IUser";
import { courseTypesDict } from "../../../shared/types/CourseTypes";
import { API_getInstructors } from "../api";
import { InstructorCombobox } from "./InstructorCombobox";

type Props = {
  value: ICourses;
  onChange: (next: ICourses) => void;
  isAdmin: boolean;
  disabled?: boolean;
};

function FieldLabel({ children }: { children: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
      {children}
    </div>
  );
}

export function CourseEditForm({ value, onChange, isAdmin, disabled }: Props) {
  const sites = useMemo(() => courseTypesDict.SiteTypes, []);
  const categories = useMemo(() => courseTypesDict.CategoryTypes, []);
  const languages = useMemo(() => courseTypesDict.LanguageTypes, []);
  const courseTypes = useMemo(() => courseTypesDict.CourseTypeTypes, []);

  // Only admins can reassign ownership, so we only fetch the list for them.
  // We still tolerate a course pointing to an instructor that's not in the
  // returned list (e.g. role changed afterwards) by injecting a fallback
  // option below.
  const [instructors, setInstructors] = useState<IUser[]>([]);
  const [instructorsError, setInstructorsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await API_getInstructors();
        if (!cancelled) setInstructors(list);
      } catch (e) {
        console.error("Could not load instructors:", e);
        if (!cancelled) setInstructorsError("Could not load instructors");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return (
    <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Edit course</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Update course details and manage lessons.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <FieldLabel>Title</FieldLabel>
          <input
            value={value.title}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 disabled:dark:bg-slate-800/60"
          />
        </label>

        <label className="flex flex-col gap-2 sm:col-span-2">
          <FieldLabel>URL</FieldLabel>
          <input
            value={value.url}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, url: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 disabled:dark:bg-slate-800/60"
          />
        </label>

        <label className="flex flex-col gap-2 sm:col-span-2">
          <FieldLabel>Intro</FieldLabel>
          <textarea
            value={value.intro ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, intro: e.target.value || null })}
            rows={4}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 disabled:dark:bg-slate-800/60"
          />
        </label>

        <label className="flex flex-col gap-2">
          <FieldLabel>Site</FieldLabel>
          <select
            value={value.site}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, site: e.target.value as ICourses["site"] })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 disabled:dark:bg-slate-800/60"
          >
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <FieldLabel>Category</FieldLabel>
          <select
            value={value.category}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, category: e.target.value as ICourses["category"] })
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 disabled:dark:bg-slate-800/60"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <FieldLabel>Subcategory</FieldLabel>
          <input
            value={value.subcategory ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, subcategory: e.target.value || null })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 disabled:dark:bg-slate-800/60"
          />
        </label>

        <label className="flex flex-col gap-2">
          <FieldLabel>Language</FieldLabel>
          <select
            value={value.language}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, language: e.target.value as ICourses["language"] })
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 disabled:dark:bg-slate-800/60"
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <FieldLabel>Course type</FieldLabel>
          <select
            value={value.course_type}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, course_type: e.target.value as ICourses["course_type"] })
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 disabled:dark:bg-slate-800/60"
          >
            {courseTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <FieldLabel>Duration (seconds)</FieldLabel>
          <input
            value={value.duration_seconds ?? ""}
            disabled={disabled}
            onChange={(e) => {
              const raw = e.target.value.trim();
              onChange({ ...value, duration_seconds: raw === "" ? null : Number(raw) });
            }}
            inputMode="numeric"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 disabled:dark:bg-slate-800/60"
          />
        </label>

        <div className="flex flex-col gap-2">
          <FieldLabel>Instructor</FieldLabel>
          {isAdmin ? (
            <InstructorCombobox
              instructors={instructors}
              value={value.instructor_id}
              disabled={disabled}
              onChange={(id) => onChange({ ...value, instructor_id: id })}
            />
          ) : (
            <input
              value={
                value.instructor_name
                  ? value.instructor_name
                  : value.instructor_id !== null
                    ? `#${value.instructor_id}`
                    : "Unassigned"
              }
              disabled
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 shadow-sm dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-400"
            />
          )}
          {isAdmin && instructorsError ? (
            <div className="text-xs text-red-600 dark:text-red-400">{instructorsError}</div>
          ) : null}
          {!isAdmin ? (
            <div className="text-xs text-gray-500 dark:text-slate-400">Only admins can change ownership.</div>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <div className="rounded-lg border border-gray-200/80 bg-gray-50 p-3 text-xs text-gray-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
            <div className="font-semibold text-gray-700 dark:text-slate-200">Read-only</div>
            <div className="mt-1">
              Course id: <span className="font-medium">#{value.id}</span> · Created{" "}
              <span className="font-medium">{value.created_at}</span> · Updated{" "}
              <span className="font-medium">{value.updated_at}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

