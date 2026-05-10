type Props = {
    /** 0-100. Values outside the range are clamped. */
    value: number;
    /** Optional textual label rendered above the bar. */
    label?: string;
    /** Right-aligned helper rendered next to the label (e.g. "3/12"). */
    rightLabel?: string;
};

export const ProgressBar = ({ value, label, rightLabel }: Props) => {
    const clamped = Math.max(0, Math.min(100, value));
    return (
        <div className="w-full">
            {(label || rightLabel) && (
                <div className="mb-1 flex items-center justify-between text-xs">
                    {label ? <span className="text-gray-600 dark:text-slate-400">{label}</span> : <span />}
                    {rightLabel ? (
                        <span className="font-medium text-gray-700 dark:text-slate-300">{rightLabel}</span>
                    ) : null}
                </div>
            )}
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
                <div
                    className="h-full rounded-full bg-gray-900 transition-[width] duration-300 dark:bg-uned-primary"
                    style={{ width: `${clamped}%` }}
                />
            </div>
        </div>
    );
};
