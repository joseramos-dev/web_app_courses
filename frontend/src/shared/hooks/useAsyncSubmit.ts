import { useState, type Dispatch, type SetStateAction } from "react";
import { resolveErrorMessage, type ErrorMessage } from "../utils/resolveErrorMessage";

export interface UseAsyncSubmitResult {
    loading: boolean;
    error: string | null;
    setError: Dispatch<SetStateAction<string | null>>;
    submit: (action: () => Promise<void>) => Promise<void>;
}

/**
 * Sibling of `useAsyncData` for actions instead of fetch-on-mount: flips
 * `loading` for the duration of `action` and captures a rejection into
 * `error`. `setError` is exposed so synchronous validation (mismatch,
 * length...) can report a failure without going through `action`.
 */
export function useAsyncSubmit(fallbackErrorMessage: ErrorMessage): UseAsyncSubmitResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (action: () => Promise<void>) => {
        setError(null);
        setLoading(true);
        try {
            await action();
        } catch (e) {
            setError(resolveErrorMessage(e, fallbackErrorMessage));
        } finally {
            setLoading(false);
        }
    };

    return { loading, error, setError, submit };
}
