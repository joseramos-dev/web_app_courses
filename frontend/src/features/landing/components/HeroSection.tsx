import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../shared/provider/AuthContext";
import { useAuthModal } from "../../../shared/context/AuthModalContext";

/** Landing hero: badge, headline, subtitle and the primary calls to action. */
export function HeroSection() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { openLogin, openRegister } = useAuthModal();

    return (
        <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-uned-primary/10 via-white to-slate-50 px-6 py-10 dark:border-slate-600 dark:from-uned-primary/20 dark:via-slate-900 dark:to-slate-800 sm:px-10">
            <div className="relative z-10 max-w-2xl">
                <p className="text-sm font-medium uppercase tracking-wide text-uned-primary">
                    {t("landing.badge")}
                </p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100 sm:text-4xl">
                    {t("landing.title")}
                </h1>
                <p className="mt-3 text-base text-gray-600 dark:text-slate-300">
                    {t("landing.subtitle")}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        to="/courses"
                        className="inline-flex items-center gap-2 rounded-lg bg-uned-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-uned-primary/90"
                    >
                        {t("landing.exploreCourses")}
                        <ArrowRight className="size-4" />
                    </Link>
                    {!user && (
                        <>
                            <button
                                type="button"
                                onClick={openRegister}
                                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                            >
                                {t("nav.register")}
                            </button>
                            <button
                                type="button"
                                onClick={openLogin}
                                className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100"
                            >
                                {t("nav.login")}
                            </button>
                        </>
                    )}
                    {user && (
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                            <GraduationCap className="size-4" />
                            {t("landing.myDashboard")}
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
