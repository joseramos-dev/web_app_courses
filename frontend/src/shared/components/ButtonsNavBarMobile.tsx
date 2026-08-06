import { useState } from "react";
import { useAuth } from "../povider/AuthContext";
import type { AuthType } from "../types/AuthTypes";
import { LogOut, Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const ButtonsNavBarMobile = (
    { isAdmin, setAuthType }: { isAdmin: boolean, setAuthType: (authType: AuthType) => void }
) => {
    const { user, logout } = useAuth();
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
    };

    const navLink = ({ isActive }: { isActive: boolean }) =>
        [
            "block px-4 py-2 text-left text-sm font-medium transition-colors",
            isActive
                ? "bg-uned-primary/12 text-uned-primary dark:bg-uned-primary/20"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        ].join(" ");

    return (
        <div className="flex md:hidden items-center ml-auto relative">
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-full text-header-foreground transition-colors hover:bg-white/10"
            >
                {isMenuOpen ? (
                    <X className="size-6" />
                ) : (
                    <Menu className="size-6" />
                )}
            </button>

            {isMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-slate-800">
                    {/* Navigation Links */}
                    <NavLink
                        to="/"
                        end
                        className={navLink}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        {t("nav.home")}
                    </NavLink>
                    <NavLink
                        to="/courses"
                        className={navLink}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        {t("nav.courses")}
                    </NavLink>
                    <NavLink
                        to="/dashboard"
                        className={navLink}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        {t("nav.dashboard")}
                    </NavLink>
                    {isAdmin && <NavLink to="/admin" className={navLink} onClick={() => setIsMenuOpen(false)}>{t("nav.admin")}</NavLink>}
                    {/* Divider */}
                    <div className="border-t border-black/10 dark:border-white/10" />

                    {/* Language Section */}
                    <LanguageSwitcher variant="mobile" />

                    {/* Divider */}
                    <div className="border-t border-black/10 dark:border-white/10" />

                    {/* Auth Section */}
                    {user ? (
                        <>
                            <Link
                                to="/settings"
                                onClick={() => setIsMenuOpen(false)}
                                className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                {t("nav.settings")}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                <LogOut className="size-4" />
                                {t("nav.logout")}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    setAuthType("Login");
                                    setIsMenuOpen(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                {t("nav.login")}
                            </button>
                            <button
                                onClick={() => {
                                    setAuthType("Register");
                                    setIsMenuOpen(false);
                                }}
                                className="mx-2 mb-2 mt-1 w-[calc(100%-1rem)] rounded-lg bg-uned-accent px-4 py-2 text-center text-sm font-semibold text-white hover:bg-uned-accent-hover"
                            >
                                {t("nav.register")}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};