import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
    CHART_BAR_FILL,
    CHART_CONTRAST,
    chartAxisTickStyle,
    chartGridProps,
    chartLegendWrapperStyle,
    chartTooltipContentStyle,
    chartTooltipCursor,
    chartTooltipLabelStyle,
    chartWrapperClassName,
} from "./chartTheme";
import { ChartEmptyState } from "./ChartEmptyState";

export type DurationRatingDatum = {
    label: string;
    enrollments_count: number;
    /** Null when nobody has rated a course of this length yet. */
    avg_rating: number | null;
    ratings_count: number;
};

type Props = {
    data: DurationRatingDatum[];
    height?: number;
};

type TooltipPayload = {
    payload?: DurationRatingDatum;
};

const MAX_RATING = 5;

function DurationTooltip({
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
                {t("charts.enrolledCount", { count: row.enrollments_count })}
            </p>
            <p className="mt-0.5">
                {row.avg_rating === null
                    ? t("charts.noRatings")
                    : t("charts.avgRatingWithVotes", {
                          value: row.avg_rating.toFixed(2),
                          count: row.ratings_count,
                      })}
            </p>
        </div>
    );
}

/**
 * Enrollments and average rating side by side, one pair per duration bucket.
 *
 * Two Y axes on purpose: enrollments run into the hundreds and ratings stop at
 * five, so a shared scale would flatten the rating bars into the baseline.
 */
export function DurationRatingChart({ data, height = 200 }: Props) {
    const { t } = useTranslation();
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
                        height={28}
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
                        domain={[0, MAX_RATING]}
                        ticks={[0, 1, 2, 3, 4, 5]}
                        width={24}
                    />
                    <Tooltip cursor={chartTooltipCursor} content={<DurationTooltip />} />
                    <Legend
                        wrapperStyle={chartLegendWrapperStyle}
                        formatter={(value) =>
                            value === "enrollments_count"
                                ? t("charts.legend.enrollments")
                                : t("charts.legend.avgRating")
                        }
                    />
                    <Bar
                        yAxisId="left"
                        dataKey="enrollments_count"
                        fill={CHART_BAR_FILL}
                        radius={[4, 4, 0, 0]}
                        name="enrollments_count"
                    />
                    <Bar
                        yAxisId="right"
                        dataKey="avg_rating"
                        fill={CHART_CONTRAST}
                        radius={[4, 4, 0, 0]}
                        name="avg_rating"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
