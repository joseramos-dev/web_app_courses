import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ChartDatum } from "./chartTheme";
import {
    CHART_PIE_COLORS,
    chartTooltipContentStyle,
    chartTooltipLabelStyle,
    chartWrapperClassName,
} from "./chartTheme";
import { ChartEmptyState } from "./ChartEmptyState";

type Props = {
    data: ChartDatum[];
    height?: number;
};

type TooltipPayload = {
    payload?: ChartDatum & { percent?: number };
};

function PieTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: TooltipPayload[];
}) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    if (!row) return null;
    const pct = row.percent != null ? (row.percent * 100).toFixed(1) : null;
    return (
        <div style={chartTooltipContentStyle} className="text-slate-800 dark:text-slate-100">
            <p style={chartTooltipLabelStyle}>{row.label}</p>
            <p className="mt-0.5">
                {row.value} matrículas{pct != null ? ` (${pct}%)` : ""}
            </p>
        </div>
    );
}

function renderLegend(value: string, entry: { payload?: { value?: number } }) {
    const count = entry.payload?.value ?? 0;
    return (
        <span className="text-xs text-gray-600 dark:text-slate-300">
            {value} ({count})
        </span>
    );
}

export function DistributionPieChart({ data, height = 220 }: Props) {
    if (data.length === 0) {
        return <ChartEmptyState />;
    }

    return (
        <div className={chartWrapperClassName}>
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="45%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                    >
                        {data.map((_, index) => (
                            <Cell
                                key={data[index].label}
                                fill={CHART_PIE_COLORS[index % CHART_PIE_COLORS.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        formatter={renderLegend}
                        wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
