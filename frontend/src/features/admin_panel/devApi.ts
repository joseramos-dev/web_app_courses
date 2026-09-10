import axios from "axios";
import { api } from "../../shared/api/api";

/**
 * Development-only maintenance endpoints.
 *
 * They exist on the backend only while ENABLE_DEV_ROUTES is on, so the panel
 * that uses them asks first with `API_devAvailable`.
 */

export interface ISeedCoursesResult {
    courses_imported: number;
    courses_seeded: number;
    topics_created: number;
    lessons_created: number;
    questions_created: number;
}

export interface ISeedUsersResult {
    students: number;
    instructors: number;
    total: number;
}

export interface IResetResult {
    tables_truncated: string[];
    users_kept: boolean;
}

export interface ISimulateStudentsResult {
    students: number;
    enrollments: number;
    completed_courses: number;
    abandoned_courses: number;
    lessons: number;
    attempts: number;
    failed_attempts: number;
    ratings: number;
    skipped: number;
}

/**
 * Whether the backend exposes its development tools.
 *
 * Deliberately asks the server instead of reading `import.meta.env.DEV`: that
 * flag describes how the frontend was built, and the Docker image serves the
 * Vite dev server whatever the backend is configured to do. A 404 here means
 * dev routes are off.
 */
export async function API_devAvailable(): Promise<boolean> {
    try {
        await api.get("/dev/status");
        return true;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return false;
        return false;
    }
}

export async function API_seedCourses(count: number): Promise<ISeedCoursesResult> {
    const { data } = await api.post<ISeedCoursesResult>("/dev/seed-courses", null, {
        params: { count },
        timeout: 120_000, // importing and seeding hundreds of courses takes a while
    });
    return data;
}

export async function API_seedUsers(count: number): Promise<ISeedUsersResult> {
    const { data } = await api.post<ISeedUsersResult>("/dev/seed-users", null, {
        params: { count },
        timeout: 120_000,
    });
    return data;
}

export async function API_deleteSeededUsers(): Promise<number> {
    const { data } = await api.delete<{ deleted: number }>("/dev/seed-users", {
        timeout: 120_000,
    });
    return data.deleted;
}

export async function API_simulateStudents(): Promise<ISimulateStudentsResult> {
    const { data } = await api.post<ISimulateStudentsResult>(
        "/dev/simulate-students",
        null,
        { timeout: 120_000 },
    );
    return data;
}

export async function API_resetDatabase(keepUsers: boolean): Promise<IResetResult> {
    const { data } = await api.post<IResetResult>("/dev/reset-database", null, {
        params: { keep_users: keepUsers },
        timeout: 120_000,
    });
    return data;
}
