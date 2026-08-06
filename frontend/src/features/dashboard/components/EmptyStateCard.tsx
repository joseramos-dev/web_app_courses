import { Link } from "react-router-dom";

type Props = {
    title: string;
    description?: string;
    action?: { label: string; to: string };
};

/**
 * Dashed-border placeholder shown when a dashboard section has no data yet
 * (e.g. no completed courses, no test attempts), with an optional CTA link.
 */
export function EmptyStateCard({ title, description, action }: Props) {
    return (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center dark:border-slate-600 dark:bg-slate-800">
            <p className="text-sm text-gray-600 dark:text-slate-300">{title}</p>
            {description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{description}</p>
            )}
            {action && (
                <Link
                    to={action.to}
                    className="mt-3 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                    {action.label}
                </Link>
            )}
        </div>
    );
}
