import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
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

export type ScoreComparisonDatum = {
    label: string;
    userScore: number;
    cohortScore: number;
};

type Props = {
    data: ScoreComparisonDatum[];
    height?: number;
};

type TooltipPayload = {
    payload?: ScoreComparisonDatum;
};

function ComparisonTooltip({
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
            <p className="mt-0.5">Tu media: {Math.round(row.userScore)}%</p>
            <p className="mt-0.5">Media cohorte: {Math.round(row.cohortScore)}%</p>
        </div>
    );
}

export function ScoreComparisonChart({ data, height = 220 }: Props) {
    if (data.length === 0) {
        return <ChartEmptyState />;
    }

    return (
        <div className={chartWrapperClassName}>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
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
                        angle={-20}
                        textAnchor="end"
                        height={48}
                    />
                    <YAxis
                        tick={chartAxisTickStyle}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                        width={32}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<ComparisonTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar
                        dataKey="userScore"
                        name="Tu media"
                        fill={CHART_BAR_FILL}
                        radius={[4, 4, 0, 0]}
                    />
                    <Bar
                        dataKey="cohortScore"
                        name="Media cohorte"
                        fill={CHART_LINE_STROKE}
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
