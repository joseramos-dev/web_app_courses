import type { IListCourseRecommendations } from "../interfaces/IRecommendation";

export const RECOMMENDATIONS_CACHE_KEY = "kursa:recommendations";
const TTL_MS = 6 * 60 * 60 * 1000;

type CachedPayload = {
    userId: number;
    cachedAt: number;
    limit: number;
    data: IListCourseRecommendations;
};

function readPayload(): CachedPayload | null {
    const raw = localStorage.getItem(RECOMMENDATIONS_CACHE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as CachedPayload;
    } catch {
        localStorage.removeItem(RECOMMENDATIONS_CACHE_KEY);
        return null;
    }
}

export function invalidateRecommendationsCache(): void {
    localStorage.removeItem(RECOMMENDATIONS_CACHE_KEY);
}

export function pruneStaleRecommendationsCache(currentUserId: number | null): void {
    const payload = readPayload();
    if (!payload) return;

    const expired = Date.now() - payload.cachedAt >= TTL_MS;
    const wrongUser =
        currentUserId === null || payload.userId !== currentUserId;

    if (expired || wrongUser) {
        invalidateRecommendationsCache();
    }
}

export function getCachedRecommendations(
    userId: number,
    limit: number,
): IListCourseRecommendations | null {
    const payload = readPayload();
    if (!payload) return null;

    if (payload.userId !== userId || payload.limit !== limit) {
        return null;
    }

    if (Date.now() - payload.cachedAt >= TTL_MS) {
        invalidateRecommendationsCache();
        return null;
    }

    return payload.data;
}

export function setCachedRecommendations(
    userId: number,
    limit: number,
    data: IListCourseRecommendations,
): void {
    const payload: CachedPayload = {
        userId,
        cachedAt: Date.now(),
        limit,
        data,
    };
    localStorage.setItem(RECOMMENDATIONS_CACHE_KEY, JSON.stringify(payload));
}
