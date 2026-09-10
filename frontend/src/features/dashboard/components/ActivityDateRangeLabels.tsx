type Props = {
    firstDate: string | undefined;
    lastDate: string | undefined;
    formatter: Intl.DateTimeFormat;
};

export function ActivityDateRangeLabels({ firstDate, lastDate, formatter }: Props) {
    return (
        <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-slate-500">
            <span>{firstDate ? formatter.format(new Date(firstDate)) : ""}</span>
            <span>{lastDate ? formatter.format(new Date(lastDate)) : ""}</span>
        </div>
    );
}
