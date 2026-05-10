import { useAuth } from "../../shared/povider/AuthContext";
import { GuestAuthGate } from "../../shared/components/RouteGuards";
import { StudentDashboard } from "./StudentDashboard";
import { InstructorDashboard } from "./InstructorDashboard";
import { AdminDashboard } from "./AdminDashboard";

export const Dashboard = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-gray-600 dark:text-slate-300">
                Cargando…
            </div>
        );
    }

    if (!user) {
        return (
            <GuestAuthGate
                title="Dashboard"
                description=""
                dashboardVariant
            />
        );
    }

    switch (user.role) {
        case "admin":
            return <AdminDashboard user={user} />;
        case "instructor":
            return <InstructorDashboard user={user} />;
        case "student":
            return <StudentDashboard user={user} />;
        default:
            return (
                <div className="mx-auto max-w-3xl px-4 py-10">
                    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Tu cuenta no tiene un rol válido para mostrar un dashboard.
                    </div>
                </div>
            );
    }
};
