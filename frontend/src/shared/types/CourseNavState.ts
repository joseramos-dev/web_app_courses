/** Location.state for /course/:id and /course/:id/lesson/:id to preserve “back” target. */
export type CourseNavState = {
    returnTo?: string;
    fromLessonProgress?: number;
};

export const DEFAULT_COURSE_RETURN = "/courses";

export function resolveReturnTo(
    state: unknown,
    fallback: string = DEFAULT_COURSE_RETURN,
): string {
    if (
        typeof state === "object" &&
        state !== null &&
        "returnTo" in state &&
        typeof (state as CourseNavState).returnTo === "string"
    ) {
        const path = (state as CourseNavState).returnTo!;
        if (path.startsWith("/") && !path.startsWith("//")) return path;
    }
    return fallback;
}

/** State to pass when opening a lesson (only returnTo; lessons must not use browser back for exit). */
export function lessonChainState(state: unknown): CourseNavState {
    return { returnTo: resolveReturnTo(state) };
}
