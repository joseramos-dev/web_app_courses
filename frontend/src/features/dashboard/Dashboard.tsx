import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/povider/AuthContext";
import { GuestAuthGate } from "../../shared/components/RouteGuards";
import { StudentDashboard } from "./StudentDashboard";
import { InstructorDashboard } from "./InstructorDashboard";
import { AdminDashboard } from "./AdminDashboard";

export const Dashboard = () => {
    const { t } = useTranslation();
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-gray-600 dark:text-slate-300">
                {t("auth.loading")}
            </div>
        );
    }

    if (!user) {
        return (
            <GuestAuthGate
                title={t("nav.dashboard")}
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
                        {t("dashboard.invalidRole")}
                    </div>
                </div>
            );
    }
};
