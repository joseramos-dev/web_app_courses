import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type DependencyList,
    type Dispatch,
    type SetStateAction,
} from "react";
import { resolveErrorMessage, type ErrorMessage } from "../utils/resolveErrorMessage";

export interface UseAsyncDataResult<T> {
    data: T | null;
    setData: Dispatch<SetStateAction<T | null>>;
    loading: boolean;
    error: string | null;
    refetch: (options?: { silent?: boolean }) => Promise<void>;
}

/**
 * Fetches `fetcher()` on mount and whenever `deps` changes, exposing the
 * usual data/loading/error triple plus a `refetch` escape hatch. `fetcher`
 * itself does not need to be memoized -- it's read from a ref on each call,
 * so only `deps` decides when a new fetch actually starts, same as a plain
 * `useEffect(fn, deps)`.
 *
 * A response superseded by a newer fetch (deps changed, or `refetch` called
 * again before the previous one resolved) is discarded instead of
 * overwriting fresher state. `refetch({ silent: true })` updates `data`/
 * `error` without touching `loading`, for refreshes that shouldn't show a
 * loading state.
 */
export function useAsyncData<T>(
    fetcher: () => Promise<T>,
    deps: DependencyList,
    options?: { errorMessage?: ErrorMessage },
): UseAsyncDataResult<T> {
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;
    const errorMessageRef = useRef(options?.errorMessage);
    errorMessageRef.current = options?.errorMessage;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);

    // Only reads/writes refs and stable setState functions, so this identity
    // never needs to change -- `refetch` can safely be a dependency of a
    // caller's own effect (e.g. to (un)subscribe to a refresh event) without
    // that effect re-running on every render.
    const run = useCallback(async (silent: boolean) => {
        const requestId = ++requestIdRef.current;
        setError(null);
        if (!silent) setLoading(true);
        try {
            const result = await fetcherRef.current();
            if (requestIdRef.current !== requestId) return;
            setData(result);
        } catch (e) {
            if (requestIdRef.current !== requestId) return;
            console.error(e);
            setError(resolveErrorMessage(e, errorMessageRef.current ?? "Unexpected error"));
        } finally {
            if (requestIdRef.current === requestId && !silent) setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        void run(false);
        // `deps` is the caller's explicit dependency list, like a plain useEffect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    const refetch = useCallback(
        (opts?: { silent?: boolean }) => run(opts?.silent ?? false),
        [run],
    );

    return { data, setData, loading, error, refetch };
}
