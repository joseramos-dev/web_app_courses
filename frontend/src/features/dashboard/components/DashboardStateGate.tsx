import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type Props<T> = {
    loading: boolean;
    error: string | null;
    data: T | null;
    children: (data: T) => ReactNode;
};

/**
 * Centralizes the loading / error / ready ternary shared by every dashboard
 * variant. `children` is a render-prop so callers get `data` narrowed to
 * non-null instead of repeating `data!` or null-checks in their JSX.
 */
export function DashboardStateGate<T>({ loading, error, data, children }: Props<T>) {
    const { t } = useTranslation();
    if (loading) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {t("dashboard.loading")}
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error ?? t("dashboard.noData")}
            </div>
        );
    }

    return <>{children(data)}</>;
}
