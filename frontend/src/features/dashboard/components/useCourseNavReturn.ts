import { useLocation } from "react-router-dom";

/**
 * Builds the `state` payload passed to course/lesson `<Link>`s from the
 * dashboards, so that navigating back from a course/lesson page returns the
 * user to the exact dashboard view (path + query string) they came from.
 */
export function useCourseNavReturn() {
    const location = useLocation();
    return { returnTo: `${location.pathname}${location.search}` };
}
