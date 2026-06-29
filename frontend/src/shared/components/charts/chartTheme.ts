import type { CSSProperties } from "react";

export type ChartDatum = {
    label: string;
    value: number;
    /** Optional caption shown in tooltip (e.g. full date). */
    title?: string;
};

export const CHART_PRIMARY = "var(--uned-primary)";
export const CHART_BAR_FILL = "var(--uned-primary)";
export const CHART_TRACK_FILL = "var(--chart-track)";
export const CHART_LINE_STROKE = "var(--uned-accent, #0ea5e9)";

export const CHART_PIE_COLORS = [
    "var(--uned-primary)",
    "#0ea5e9",
    "#8b5cf6",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#6366f1",
];

export const chartWrapperClassName =
    "w-full text-slate-600 dark:text-slate-400";

export const chartAxisTickStyle = {
    fill: "currentColor",
    fontSize: 10,
};

export const chartGridProps = {
    strokeDasharray: "3 3",
    stroke: "currentColor",
    opacity: 0.2,
    vertical: false as const,
};

export const chartTooltipContentStyle: CSSProperties = {
    background: "var(--surface-muted, #fff)",
    border: "1px solid rgb(203 213 225)",
    borderRadius: "8px",
    fontSize: "12px",
};

export const chartTooltipLabelStyle: CSSProperties = {
    color: "inherit",
    fontWeight: 600,
};
