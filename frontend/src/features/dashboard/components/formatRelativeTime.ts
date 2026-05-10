// Small dependency-free helper for relative date formatting on the
// dashboards. We don't pull in `date-fns` or `dayjs` for this one feature.
export function formatRelativeTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return "—";

    const diffMs = Date.now() - then.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "hace unos segundos";

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `hace ${diffMin} min`;

    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH} h`;

    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `hace ${diffD} d`;

    const diffW = Math.floor(diffD / 7);
    if (diffW < 5) return `hace ${diffW} sem`;

    return then.toLocaleDateString();
}
