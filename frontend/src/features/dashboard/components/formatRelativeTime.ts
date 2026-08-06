// Small dependency-free helper for relative date formatting on the
// dashboards, backed by the standard `Intl.RelativeTimeFormat`.
export function formatRelativeTime(
    iso: string | null | undefined,
    locale?: string,
): string {
    if (!iso) return "—";
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return "—";

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "short" });
    const diffMs = Date.now() - then.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return rtf.format(0, "second");

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return rtf.format(-diffMin, "minute");

    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return rtf.format(-diffH, "hour");

    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return rtf.format(-diffD, "day");

    const diffW = Math.floor(diffD / 7);
    if (diffW < 5) return rtf.format(-diffW, "week");

    return then.toLocaleDateString(locale);
}
