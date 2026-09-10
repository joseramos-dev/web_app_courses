import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
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

export type CategoryRatingDatum = {
    label: string;
    avg_rating: number;
    ratings_count: number;
};

type Props = {
    data: CategoryRatingDatum[];
    height?: number;
};

type TooltipPayload = {
    payload?: CategoryRatingDatum;
};

const MAX_RATING = 5;

function CategoryRatingTooltip({
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
                {t("charts.avgRatingWithVotes", {
                    value: row.avg_rating.toFixed(2),
                    count: row.ratings_count,
                })}
            </p>
        </div>
    );
}

/**
 * Average rating per category, with the number of votes printed over each bar.
 *
 * The vote count is not decoration. Categories here are rated by a handful of
 * students, so an average over four votes and one over twenty look identical
 * on a 0-5 axis while meaning very different things. The caller orders the
 * data by votes rather than by score for the same reason: read left to right,
 * confidence decreases.
 */
export function CategoryRatingChart({ data, height = 200 }: Props) {
    if (data.length === 0) {
        return <ChartEmptyState />;
    }

    return (
        <div className={chartWrapperClassName}>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={data}
                    margin={{ top: 16, right: 4, left: -20, bottom: 0 }}
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
                        height={64}
                    />
                    <YAxis
                        tick={chartAxisTickStyle}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, MAX_RATING]}
                        ticks={[0, 1, 2, 3, 4, 5]}
                        width={24}
                    />
                    <Tooltip
                        cursor={chartTooltipCursor}
                        content={<CategoryRatingTooltip />}
                    />
                    <Bar
                        dataKey="avg_rating"
                        fill={CHART_BAR_FILL}
                        radius={[4, 4, 0, 0]}
                        minPointSize={2}
                    >
                        <LabelList
                            dataKey="ratings_count"
                            position="top"
                            fill="currentColor"
                            fontSize={10}
                            formatter={(value) => `${value}`}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
