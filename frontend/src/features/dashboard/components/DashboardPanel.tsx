import type { ReactNode } from "react";

type Props = {
    title?: string;
    description?: string;
    icon?: ReactNode;
    variant?: "padded" | "divided";
    className?: string;
    children: ReactNode;
};

const PANEL_WRAPPER_CLASS =
    "rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800";

function PanelHeading({ icon, title }: { icon?: ReactNode; title?: string }) {
    if (!icon) {
        return (
            title && (
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                    {title}
                </h2>
            )
        );
    }
    return (
        <div className="flex items-center gap-2">
            {icon}
            {title && (
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                    {title}
                </h2>
            )}
        </div>
    );
}

/**
 * Shared card shell for dashboard sections: a bordered panel with an
 * optional title/description/icon header, used across the
 * Student/Instructor/Admin dashboards.
 *
 * - "padded" (default): header and body share the same padding; used for
 *   simple sections (charts, short empty-state text, ...).
 * - "divided": the header gets its own bottom border and padding while the
 *   body has none, for when the body is a list/table managing its own
 *   per-row padding.
 */
export function DashboardPanel({
    title,
    description,
    icon,
    variant = "padded",
    className,
    children,
}: Props) {
    const hasHeader = Boolean(title || icon);

    if (variant === "divided") {
        return (
            <div className={`${PANEL_WRAPPER_CLASS}${className ? ` ${className}` : ""}`}>
                {hasHeader && (
                    <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-600">
                        <PanelHeading icon={icon} title={title} />
                        {description && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>
                )}
                {children}
            </div>
        );
    }

    return (
        <div className={`${PANEL_WRAPPER_CLASS} p-4${className ? ` ${className}` : ""}`}>
            <PanelHeading icon={icon} title={title} />
            {description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{description}</p>
            )}
            {children}
        </div>
    );
}
