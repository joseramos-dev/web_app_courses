import type { ReactNode } from "react";

export type StatCardProps = {
    icon: ReactNode;
    label: string;
    value: string;
    helper?: string;
};

export const StatCard = ({ icon, label, value, helper }: StatCardProps) => (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
                <div className="text-xl font-semibold text-gray-900 dark:text-slate-100">{value}</div>
            </div>
        </div>
        {helper && <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">{helper}</div>}
    </div>
);
