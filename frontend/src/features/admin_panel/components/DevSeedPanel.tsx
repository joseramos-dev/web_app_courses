import { useEffect, useState } from "react";
import { Database, GraduationCap, TriangleAlert, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
    API_deleteSeededUsers,
    API_devAvailable,
    API_resetDatabase,
    API_seedCourses,
    API_seedUsers,
    API_simulateStudents,
} from "../devApi";
import { runWithToastSaving } from "../../../shared/utils/runWithToastSaving";

const DEFAULT_COURSES = 300;
const DEFAULT_USERS = 100;

type Busy = "courses" | "users" | "deleteUsers" | "simulate" | "reset" | null;

const buttonClass =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60";

/**
 * Demo-data controls, shown on the admin dashboard only while the backend
 * exposes its development routes.
 *
 * Availability is asked of the server rather than inferred from the frontend
 * build: the Docker image runs the Vite dev server regardless of how the
 * backend is configured, so `import.meta.env.DEV` would light this up against a
 * production API.
 */
export function DevSeedPanel() {
    const { t } = useTranslation();
    const [available, setAvailable] = useState(false);
    const [busy, setBusy] = useState<Busy>(null);
    const [courseCount, setCourseCount] = useState(String(DEFAULT_COURSES));
    const [userCount, setUserCount] = useState(String(DEFAULT_USERS));

    useEffect(() => {
        let cancelled = false;
        void API_devAvailable().then((ok) => {
            if (!cancelled) setAvailable(ok);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!available) return null;

    const asCount = (raw: string, fallback: number) => {
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
    };

    const run = async (kind: Exclude<Busy, null>, action: () => Promise<string>) => {
        const message = await runWithToastSaving<string, Busy>(
            setBusy,
            kind,
            null,
            action,
            t("devPanel.failed"),
        );
        if (message !== undefined) {
            toast.success(message, { duration: 6000 });
        }
    };

    const seedCourses = () =>
        run("courses", async () => {
            const r = await API_seedCourses(asCount(courseCount, DEFAULT_COURSES));
            return t("devPanel.coursesDone", {
                imported: r.courses_imported,
                seeded: r.courses_seeded,
                lessons: r.lessons_created,
            });
        });

    const seedUsers = () =>
        run("users", async () => {
            const r = await API_seedUsers(asCount(userCount, DEFAULT_USERS));
            return t("devPanel.usersDone", {
                students: r.students,
                instructors: r.instructors,
            });
        });

    const removeUsers = () =>
        run("deleteUsers", async () =>
            t("devPanel.usersRemoved", { count: await API_deleteSeededUsers() }),
        );

    const simulateStudents = () =>
        run("simulate", async () => {
            const r = await API_simulateStudents();
            return t("devPanel.simulateDone", {
                students: r.students,
                enrollments: r.enrollments,
                lessons: r.lessons,
            });
        });

    const reset = (keepUsers: boolean) => {
        if (!confirm(t(keepUsers ? "devPanel.confirmReset" : "devPanel.confirmResetAll")))
            return;
        void run("reset", async () => {
            const r = await API_resetDatabase(keepUsers);
            return t("devPanel.resetDone", { count: r.tables_truncated.length });
        });
    };

    return (
        <section className="rounded-xl border border-dashed border-amber-400/70 bg-amber-50/60 p-4 dark:border-amber-500/50 dark:bg-amber-950/20">
            <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {t("devPanel.title")}
                    </h2>
                    <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                        {t("devPanel.description")}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
                        {t("devPanel.coursesLabel")}
                        <input
                            value={courseCount}
                            onChange={(e) => setCourseCount(e.target.value)}
                            inputMode="numeric"
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-sm normal-case text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </label>
                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                        {t("devPanel.coursesHint")}
                    </p>
                    <button
                        type="button"
                        onClick={() => void seedCourses()}
                        disabled={busy !== null}
                        className={`${buttonClass} mt-3 w-full bg-uned-primary text-white hover:bg-uned-primary-hover`}
                    >
                        <Database className="size-4" aria-hidden />
                        {busy === "courses" ? t("devPanel.working") : t("devPanel.seedCourses")}
                    </button>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
                        {t("devPanel.usersLabel")}
                        <input
                            value={userCount}
                            onChange={(e) => setUserCount(e.target.value)}
                            inputMode="numeric"
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-sm normal-case text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </label>
                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                        {t("devPanel.usersHint")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void seedUsers()}
                            disabled={busy !== null}
                            className={`${buttonClass} flex-1 bg-uned-primary text-white hover:bg-uned-primary-hover`}
                        >
                            <Users className="size-4" aria-hidden />
                            {busy === "users" ? t("devPanel.working") : t("devPanel.seedUsers")}
                        </button>
                        <button
                            type="button"
                            onClick={() => void removeUsers()}
                            disabled={busy !== null}
                            className={`${buttonClass} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`}
                        >
                            {busy === "deleteUsers" ? t("devPanel.working") : t("devPanel.removeUsers")}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => void simulateStudents()}
                        disabled={busy !== null}
                        className={`${buttonClass} mt-2 w-full border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`}
                    >
                        <GraduationCap className="size-4" aria-hidden />
                        {busy === "simulate" ? t("devPanel.working") : t("devPanel.simulateStudents")}
                    </button>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-amber-300/60 pt-3 dark:border-amber-600/40">
                <span className="text-xs text-gray-600 dark:text-slate-400">
                    {t("devPanel.resetLabel")}
                </span>
                <button
                    type="button"
                    onClick={() => reset(true)}
                    disabled={busy !== null}
                    className={`${buttonClass} border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-500/60 dark:bg-slate-900 dark:text-red-300`}
                >
                    {t("devPanel.resetKeepUsers")}
                </button>
                <button
                    type="button"
                    onClick={() => reset(false)}
                    disabled={busy !== null}
                    className={`${buttonClass} bg-red-600 text-white hover:bg-red-700`}
                >
                    {t("devPanel.resetAll")}
                </button>
            </div>
        </section>
    );
}
