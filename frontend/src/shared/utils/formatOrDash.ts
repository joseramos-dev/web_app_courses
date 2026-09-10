export function formatOrDash<T>(
    value: T | null | undefined,
    format: (value: T) => string,
): string {
    return value != null ? format(value) : "—";
}
