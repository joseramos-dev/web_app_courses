import type { CSSProperties } from "react";

export type ChartDatum = {
    label: string;
    value: number;
    /** Optional caption shown in tooltip (e.g. full date). */
    title?: string;
};

/** Primary series: bars, main progress, first comparison group. */
export const CHART_PRIMARY = "var(--chart-series-1)";
export const CHART_BAR_FILL = CHART_PRIMARY;

/** Secondary series: cohort averages, lines, second comparison group. */
export const CHART_SECONDARY = "var(--chart-series-2)";

/** @deprecated Use CHART_SECONDARY — kept for existing imports. */
export const CHART_LINE_STROKE = CHART_SECONDARY;

export const CHART_TRACK_FILL = "var(--chart-track)";

/** Distinct fills for pie / multi-series charts (theme-aware via CSS variables). */
export const CHART_PIE_COLORS = [
    "var(--chart-series-1)",
    "var(--chart-series-2)",
    "var(--chart-series-3)",
    "var(--chart-series-4)",
    "var(--chart-series-5)",
    "var(--chart-series-6)",
    "var(--chart-series-7)",
] as const;

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

/** Subtle bar-band highlight on hover — inherits axis text color from the wrapper. */
export const chartTooltipCursor = {
    fill: "currentColor",
    opacity: 0.08,
} as const;

export const chartLegendWrapperStyle: CSSProperties = {
    fontSize: "11px",
    color: "currentColor",
};

export const chartTooltipContentStyle: CSSProperties = {
    background: "var(--surface-muted, #fff)",
    border: "1px solid var(--chart-tooltip-border, rgb(203 213 225))",
    borderRadius: "8px",
    fontSize: "12px",
};

export const chartTooltipLabelStyle: CSSProperties = {
    color: "inherit",
    fontWeight: 600,
};

/** Pie slice hover: slight emphasis without a harsh white flash in dark mode. */
export const chartPieActiveShape = {
    stroke: "currentColor",
    strokeWidth: 1,
    opacity: 0.92,
} as const;
