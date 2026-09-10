import { useTranslation } from "react-i18next";
import {
    getSortByEntries,
    type sort_by_dir,
    type sort_by_types,
} from "../../../shared/types/SortTypes";

type Props = {
    sortBy: sort_by_types;
    sortDirection: sort_by_dir;
    onSortByChange: (value: sort_by_types) => void;
    onToggleDirection: () => void;
};

export function SortControls({
    sortBy,
    sortDirection,
    onSortByChange,
    onToggleDirection,
}: Props) {
    const { t } = useTranslation();
    const ascending = sortDirection === "asc";

    return (
        <>
            <button
                type="button"
                className="py-2 pl-4 text-slate-800 dark:text-slate-200"
                onClick={onToggleDirection}
                // Without this the only content is an arrow glyph, which a
                // screen reader announces as "black up-pointing triangle".
                aria-label={t(ascending ? "courses.sortAscending" : "courses.sortDescending")}
            >
                <span aria-hidden>{ascending ? "▲" : "▼"}</span>
            </button>
            <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as sort_by_types)}
                aria-label={t("courses.sortByLabel")}
                className="courses-sort-select cursor-pointer appearance-none border-0 bg-transparent py-2 pl-1 pr-6 text-slate-800 focus:outline-none focus:ring-0 dark:text-slate-200"
            >
                {getSortByEntries(t).map(([key, label]) => (
                    <option key={key} value={key} className="bg-white text-slate-900">
                        {t("courses.orderBy", { label })}
                    </option>
                ))}
            </select>
        </>
    );
}
