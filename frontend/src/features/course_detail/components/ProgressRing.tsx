type Props = {
    percent: number;
    size?: number;
    strokeWidth?: number;
};

export function ProgressRing({ percent, size = 88, strokeWidth = 8 }: Props) {
    const clamped = Math.max(0, Math.min(100, percent));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-gray-200 dark:text-slate-600"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="text-green-600 transition-all duration-500 dark:text-uned-primary"
            />
        </svg>
    );
}
