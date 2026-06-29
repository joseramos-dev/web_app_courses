import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CHART_BAR_FILL, CHART_TRACK_FILL, chartWrapperClassName } from "./chartTheme";

type Props = {
    /** 0-100. Values outside the range are clamped. */
    value: number;
    label?: string;
    rightLabel?: string;
};

const TRACK_KEY = "track";
const PROGRESS_KEY = "progress";

const NAME_KEY = "name";

export function CourseProgressChart({ value, label, rightLabel }: Props) {
    const clamped = Math.max(0, Math.min(100, value));

    const barData = useMemo(
        () => [
            {
                [NAME_KEY]: "progress",
                [PROGRESS_KEY]: clamped,
                [TRACK_KEY]: 100 - clamped,
            },
        ],
        [clamped],
    );

    return (
        <div className={chartWrapperClassName}>
            {(label || rightLabel) && (
                <div className="mb-1 flex items-center justify-between text-xs">
                    {label ? (
                        <span className="text-gray-600 dark:text-slate-400">{label}</span>
                    ) : (
                        <span />
                    )}
                    {rightLabel ? (
                        <span className="font-medium text-gray-700 dark:text-slate-300">
                            {rightLabel}
                        </span>
                    ) : null}
                </div>
            )}
            <ResponsiveContainer width="100%" height={8}>
                <BarChart
                    layout="vertical"
                    data={barData}
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    barCategoryGap={0}
                    barGap={0}
                >
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis type="category" dataKey={NAME_KEY} hide width={0} />
                    <Bar
                        dataKey={PROGRESS_KEY}
                        stackId="progress"
                        fill={CHART_BAR_FILL}
                        radius={[4, 0, 0, 4]}
                        isAnimationActive={false}
                    />
                    <Bar
                        dataKey={TRACK_KEY}
                        stackId="progress"
                        fill={CHART_TRACK_FILL}
                        radius={[0, 4, 4, 0]}
                        isAnimationActive={false}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
