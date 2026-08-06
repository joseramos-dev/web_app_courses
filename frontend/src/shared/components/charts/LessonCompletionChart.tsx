import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
    CHART_BAR_FILL,
    chartAxisTickStyle,
    chartGridProps,
    chartTooltipContentStyle,
    chartTooltipCursor,
    chartTooltipLabelStyle,
    chartWrapperClassName,
} from "./chartTheme";
import { ChartEmptyState } from "./ChartEmptyState";

export type LessonCompletionDatum = {
    label: string;
    value: number;
    title?: string;
    completionRate?: number;
};

type Props = {
    data: LessonCompletionDatum[];
    height?: number;
};

type TooltipPayload = {
    payload?: LessonCompletionDatum;
};

function LessonTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: TooltipPayload[];
}) {
    const { t } = useTranslation();
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    if (!row) return null;
    const heading = row.title ?? row.label;
    const rate =
        row.completionRate != null
            ? t("charts.lesson.completedPercent", { value: Math.round(row.completionRate * 100) })
            : null;
    return (
        <div style={chartTooltipContentStyle} className="text-slate-800 dark:text-slate-100">
            <p style={chartTooltipLabelStyle}>{heading}</p>
            <p className="mt-0.5">{t("charts.lesson.studentsCompleted", { count: row.value })}</p>
            {rate ? <p className="mt-0.5 text-xs opacity-80">{rate}</p> : null}
        </div>
    );
}

export function LessonCompletionChart({ data, height = 240 }: Props) {
    if (data.length === 0) {
        return <ChartEmptyState />;
    }

    const chartHeight = Math.max(height, data.length * 36);
    const maxValue = Math.max(...data.map((d) => d.value));
    const xDomainMax = maxValue === 0 ? 1 : maxValue;

    return (
        <div className={chartWrapperClassName}>
            <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                    <CartesianGrid {...chartGridProps} horizontal={false} />
                    <XAxis
                        type="number"
                        tick={chartAxisTickStyle}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        domain={[0, xDomainMax]}
                    />
                    <YAxis
                        type="category"
                        dataKey="label"
                        tick={chartAxisTickStyle}
                        axisLine={false}
                        tickLine={false}
                        width={120}
                    />
                    <Tooltip
                        cursor={chartTooltipCursor}
                        content={<LessonTooltip />}
                    />
                    <Bar
                        dataKey="value"
                        fill={CHART_BAR_FILL}
                        radius={[0, 4, 4, 0]}
                        minPointSize={2}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
