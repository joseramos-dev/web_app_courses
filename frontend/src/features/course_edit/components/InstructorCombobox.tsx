import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { IUser } from "../../../shared/interfaces/IUser";

type Props = {
  instructors: IUser[];
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
};

// Searchable combobox for picking an instructor. Used only on the admin view
// of CourseEditForm. Built from scratch (instead of MUI Autocomplete) so it
// fits the Tailwind look of the rest of the form.
export function InstructorCombobox({
  instructors,
  value,
  onChange,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(
    () => instructors.find((u) => u.id === value) ?? null,
    [instructors, value],
  );

  const q = query.trim().toLowerCase();
  const options = useMemo(() => {
    if (!q) return instructors;
    return instructors.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [instructors, q]);

  // Reset the highlighted index whenever the visible list changes so the
  // user is never aiming at an out-of-range option.
  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Close on outside click and forget any in-progress query.
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  // Keep the highlighted item in view when navigating with the keyboard.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx='${highlight}']`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const commit = (id: number | null) => {
    onChange(id);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      // +1 row for the "Unassigned" option that always sits on top.
      setHighlight((h) => Math.min(h + 1, options.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (highlight === 0) {
        commit(null);
      } else {
        const o = options[highlight - 1];
        if (o && o.id !== null) commit(o.id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    } else if (e.key === "Tab") {
      // Tabbing away should also dismiss the popup gracefully.
      setOpen(false);
      setQuery("");
    }
  };

  // What the input visibly shows. While the popup is open we show the live
  // query so the user can keep typing; when closed we show the canonical
  // label for the selected instructor (or a fallback for orphan ids).
  const orphanLabel =
    value !== null && !selected
      ? t("courseEdit.instructorCombobox.orphanLabel", { id: value })
      : "";
  const selectedLabel = selected
    ? `${selected.name} (${selected.email})`
    : orphanLabel;
  const inputValue = open ? query : selectedLabel;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="instructor-combobox-list"
          aria-autocomplete="list"
          disabled={disabled}
          value={inputValue}
          placeholder={t("courseEdit.instructorCombobox.searchPlaceholder")}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 disabled:dark:bg-slate-800/60"
        />
        {value !== null && !disabled ? (
          <button
            type="button"
            aria-label={t("courseEdit.instructorCombobox.clearAria")}
            onMouseDown={(e) => {
              // mousedown + preventDefault so the input doesn't blur before
              // we get to handle the click.
              e.preventDefault();
              commit(null);
            }}
            className="absolute inset-y-0 right-2 my-auto flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            ×
          </button>
        ) : (
          <span className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-400">
            ▾
          </span>
        )}
      </div>

      {open && !disabled ? (
        <ul
          ref={listRef}
          id="instructor-combobox-list"
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          <li
            role="option"
            aria-selected={value === null}
            data-idx={0}
            onMouseEnter={() => setHighlight(0)}
            onMouseDown={(e) => {
              e.preventDefault();
              commit(null);
            }}
            className={`cursor-pointer px-3 py-2 text-sm italic text-gray-500 dark:text-slate-400 ${
              highlight === 0
                ? "bg-gray-100 dark:bg-slate-700"
                : "hover:bg-gray-50 dark:hover:bg-slate-700/80"
            }`}
          >
            {t("courseEdit.instructorCombobox.unassignedOption")}
          </li>
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">{t("courseEdit.instructorCombobox.noMatches")}</li>
          ) : (
            options.map((u, idx) => {
              const rowIdx = idx + 1;
              const isSelected = u.id === value;
              const isHighlighted = highlight === rowIdx;
              return (
                <li
                  key={u.id ?? -1}
                  role="option"
                  aria-selected={isSelected}
                  data-idx={rowIdx}
                  onMouseEnter={() => setHighlight(rowIdx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (u.id !== null) commit(u.id);
                  }}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    isHighlighted ? "bg-gray-100 dark:bg-slate-700" : ""
                  } ${!isHighlighted ? "hover:bg-gray-50 dark:hover:bg-slate-700/50" : ""}`}
                >
                  <div
                    className={`text-gray-900 dark:text-slate-100 ${
                      isSelected ? "font-semibold" : ""
                    }`}
                  >
                    {u.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{u.email}</div>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
