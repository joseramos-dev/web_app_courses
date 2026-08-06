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
import { useTranslation } from "react-i18next";
import {
    CHART_BAR_FILL,
    CHART_SECONDARY,
    chartAxisTickStyle,
    chartGridProps,
    chartLegendWrapperStyle,
    chartTooltipContentStyle,
    chartTooltipCursor,
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
    const { t } = useTranslation();
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    if (!row) return null;
    return (
        <div style={chartTooltipContentStyle} className="text-slate-800 dark:text-slate-100">
            <p style={chartTooltipLabelStyle}>{row.label}</p>
            <p className="mt-0.5">
                {t("charts.score.tooltipYourAverage", { value: Math.round(row.userScore) })}
            </p>
            <p className="mt-0.5">
                {t("charts.score.tooltipCohortAverage", { value: Math.round(row.cohortScore) })}
            </p>
        </div>
    );
}

export function ScoreComparisonChart({ data, height = 220 }: Props) {
    const { t } = useTranslation();
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
                    <Tooltip cursor={chartTooltipCursor} content={<ComparisonTooltip />} />
                    <Legend wrapperStyle={chartLegendWrapperStyle} />
                    <Bar
                        dataKey="userScore"
                        name={t("charts.score.yourAverage")}
                        fill={CHART_BAR_FILL}
                        radius={[4, 4, 0, 0]}
                    />
                    <Bar
                        dataKey="cohortScore"
                        name={t("charts.score.cohortAverage")}
                        fill={CHART_SECONDARY}
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
