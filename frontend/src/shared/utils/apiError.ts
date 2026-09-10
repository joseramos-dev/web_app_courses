import { isAxiosError } from "axios";

/**
 * The message the backend actually sent, or `fallback` when there is none.
 *
 * The API answers a rejected upload with a usable explanation
 * ("Tipo MIME no permitido: image/png", "El archivo supera el tamaño máximo"),
 * and throwing that away for a generic "no se pudo subir el archivo" leaves the
 * user with no way to find out what to do differently.
 *
 * Handles both shapes in use: an `AxiosError` carrying `{ detail }`, and the
 * plain strings some feature modules re-throw.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === "string" && error.trim()) return error;
    if (isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
        if (typeof detail === "string" && detail.trim()) return detail;
    }
    return fallback;
}
