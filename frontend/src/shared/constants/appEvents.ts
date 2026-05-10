/** Fired after lesson/course progress changes so dashboards can refetch. */
export const KURSA_DASHBOARD_REFRESH_EVENT = "kursa-dashboard-refresh";

/** `detail: { courseId: number }` — course page can refetch enrollment (e.g. other tab). */
export const KURSA_COURSE_ENROLLMENT_CHANGED_EVENT = "kursa-course-enrollment-changed";
