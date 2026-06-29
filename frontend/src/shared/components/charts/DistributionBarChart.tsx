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
import type { ChartDatum } from "./chartTheme";
import {
    CHART_BAR_FILL,
    chartAxisTickStyle,
    chartGridProps,
    chartTooltipContentStyle,
    chartTooltipLabelStyle,
    chartWrapperClassName,
} from "./chartTheme";
import { ChartEmptyState } from "./ChartEmptyState";

type Props = {
    data: ChartDatum[];
    height?: number;
    showValues?: boolean;
    valueLabel?: string;
};

type TooltipPayload = {
    payload?: ChartDatum;
};

function DistributionTooltip({
    active,
    payload,
    valueLabel,
}: {
    active?: boolean;
    payload?: TooltipPayload[];
    valueLabel: string;
}) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    if (!row) return null;
    const heading = row.title ?? row.label;
    return (
        <div style={chartTooltipContentStyle} className="text-slate-800 dark:text-slate-100">
            <p style={chartTooltipLabelStyle}>{heading}</p>
            <p className="mt-0.5">
                {row.value} {valueLabel}
            </p>
        </div>
    );
}

export function DistributionBarChart({
    data,
    height = 160,
    showValues = false,
    valueLabel = "matrículas",
}: Props) {
    if (data.length === 0) {
        return <ChartEmptyState />;
    }

    const maxValue = Math.max(...data.map((d) => d.value));
    const yDomainMax = maxValue === 0 ? 1 : maxValue;

    return (
        <div className={chartWrapperClassName}>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={data}
                    margin={{ top: showValues ? 16 : 4, right: 4, left: -20, bottom: 0 }}
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
                        tick={chartAxisTickStyle}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        domain={[0, yDomainMax]}
                        width={28}
                    />
                    <Tooltip
                        cursor={{ fill: "currentColor", opacity: 0.08 }}
                        content={<DistributionTooltip valueLabel={valueLabel} />}
                    />
                    <Bar
                        dataKey="value"
                        fill={CHART_BAR_FILL}
                        radius={[4, 4, 0, 0]}
                        minPointSize={2}
                    >
                        {showValues ? (
                            <LabelList
                                dataKey="value"
                                position="top"
                                fill="currentColor"
                                fontSize={10}
                            />
                        ) : null}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
