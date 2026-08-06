import type { Key, ReactNode } from "react";

type Props<T> = {
    items: T[];
    keyFor: (item: T, index: number) => Key;
    renderLeft: (item: T) => ReactNode;
    renderRight: (item: T) => ReactNode;
    className?: string;
    itemClassName?: string;
};

const RANK_BADGE_CLASS =
    "inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-slate-700 dark:text-slate-200";

/**
 * Renders a numbered ranking list (circular "1, 2, 3..." badge + left
 * content + right content), used by the "most popular courses" / "most
 * active students" panels across the Admin and Instructor dashboards.
 */
export function RankedList<T>({
    items,
    keyFor,
    renderLeft,
    renderRight,
    className = "divide-y divide-gray-100 dark:divide-slate-700",
    itemClassName = "flex items-center justify-between px-4 py-2 text-sm",
}: Props<T>) {
    return (
        <ol className={className}>
            {items.map((item, idx) => (
                <li key={keyFor(item, idx)} className={itemClassName}>
                    <span className="flex items-center gap-2">
                        <span className={RANK_BADGE_CLASS}>{idx + 1}</span>
                        {renderLeft(item)}
                    </span>
                    <span className="text-gray-600 dark:text-slate-300">
                        {renderRight(item)}
                    </span>
                </li>
            ))}
        </ol>
    );
}
