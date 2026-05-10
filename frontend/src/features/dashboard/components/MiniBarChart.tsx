type BarDatum = {
    label: string;
    value: number;
    /** Optional caption shown on hover (e.g. full date). */
    title?: string;
};

type Props = {
    data: BarDatum[];
    /** Bars become this tall when their value equals the series max. */
    height?: number;
    /** Show the numeric value on top of each bar. */
    showValues?: boolean;
};

// Minimal SVG bar chart. We avoid charting libraries on purpose: this
// component is used in two dashboards for what are essentially sparkline-
// style bars and a charting library would be overkill (and force us to
// add another dependency). Bars scale relative to the series max so the
// chart is always full-height when there's data, and degrades to an empty
// hint when every value is 0.
export const MiniBarChart = ({ data, height = 120, showValues }: Props) => {
    if (data.length === 0) {
        return (
            <div className="flex h-24 items-center justify-center text-xs text-gray-400 dark:text-slate-500">
                No data
            </div>
        );
    }

    const max = Math.max(...data.map((d) => d.value));
    const allZero = max === 0;

    return (
        <div className="w-full">
            <div
                className="flex items-end gap-1"
                style={{ height: `${height}px` }}
            >
                {data.map((d, idx) => {
                    const ratio = allZero ? 0 : d.value / max;
                    // Always show a 2px sliver so empty bars are still
                    // visible as a baseline. Pure flex+height for crisp
                    // rendering at any zoom level.
                    const barHeight = allZero ? 2 : Math.max(2, ratio * height);
                    return (
                        <div
                            key={idx}
                            className="flex flex-1 flex-col items-center justify-end"
                            title={d.title ?? `${d.label}: ${d.value}`}
                        >
                            {showValues && d.value > 0 ? (
                                <div className="mb-1 text-[10px] font-medium text-gray-500 dark:text-slate-400">
                                    {d.value}
                                </div>
                            ) : null}
                            <div
                                className="w-full rounded-t bg-gray-900/80 transition-colors hover:bg-gray-900 dark:bg-uned-primary/85 dark:hover:bg-uned-primary"
                                style={{ height: `${barHeight}px` }}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="mt-1 flex gap-1">
                {data.map((d, idx) => (
                    <div
                        key={idx}
                        className="flex-1 truncate text-center text-[10px] text-gray-400 dark:text-slate-500"
                    >
                        {d.label}
                    </div>
                ))}
            </div>
        </div>
    );
};
