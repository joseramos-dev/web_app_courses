import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    CHART_BAR_FILL,
    CHART_LINE_STROKE,
    chartAxisTickStyle,
    chartGridProps,
    chartTooltipContentStyle,
    chartTooltipLabelStyle,
    chartWrapperClassName,
} from "./chartTheme";
import { ChartEmptyState } from "./ChartEmptyState";

export type CohortChartDatum = {
    label: string;
    enrollments_count: number;
    avg_progress_percent: number;
    completion_rate: number;
};

type Props = {
    data: CohortChartDatum[];
    height?: number;
};

type TooltipPayload = {
    payload?: CohortChartDatum;
};

function CohortTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: TooltipPayload[];
}) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    if (!row) return null;
    return (
        <div style={chartTooltipContentStyle} className="text-slate-800 dark:text-slate-100">
            <p style={chartTooltipLabelStyle}>{row.label}</p>
            <p className="mt-0.5">{row.enrollments_count} matriculados</p>
            <p className="mt-0.5">
                Progreso medio: {Math.round(row.avg_progress_percent)}%
            </p>
            <p className="mt-0.5">
                Finalización: {Math.round(row.completion_rate * 100)}%
            </p>
        </div>
    );
}

export function CohortComparisonChart({ data, height = 200 }: Props) {
    if (data.length === 0) {
        return <ChartEmptyState />;
    }

    const maxEnrollments = Math.max(...data.map((d) => d.enrollments_count));
    const yLeftMax = maxEnrollments === 0 ? 1 : maxEnrollments;

    return (
        <div className={chartWrapperClassName}>
            <ResponsiveContainer width="100%" height={height}>
                <ComposedChart
                    data={data}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                    <CartesianGrid {...chartGridProps} />
                    <XAxis
                        dataKey="label"
                        tick={chartAxisTickStyle}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={52}
                    />
                    <YAxis
                        yAxisId="left"
                        tick={chartAxisTickStyle}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        domain={[0, yLeftMax]}
                        width={28}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={chartAxisTickStyle}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                        width={32}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CohortTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: "11px" }}
                        formatter={(value) =>
                            value === "enrollments_count"
                                ? "Matriculados"
                                : "Progreso medio"
                        }
                    />
                    <Bar
                        yAxisId="left"
                        dataKey="enrollments_count"
                        fill={CHART_BAR_FILL}
                        radius={[4, 4, 0, 0]}
                        name="enrollments_count"
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avg_progress_percent"
                        stroke={CHART_LINE_STROKE}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="avg_progress_percent"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
