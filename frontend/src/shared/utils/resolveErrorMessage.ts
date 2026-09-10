export type ErrorMessage = string | ((error: unknown) => string);

export function resolveErrorMessage(error: unknown, fallback: ErrorMessage): string {
    if (typeof fallback === "function") return fallback(error);
    return typeof error === "string" ? error : fallback;
}
