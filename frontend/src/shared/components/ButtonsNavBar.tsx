import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../povider/AuthContext";
import { useState } from "react";
import type { AuthType } from "../types/AuthTypes";
import { LogOut, User } from "lucide-react";


export const ButtonsNavBar = (
    { isAdmin, setAuthType }: { isAdmin: boolean, setAuthType: (authType: AuthType) => void }
) => {
    const { user, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const navLink = ({ isActive }: { isActive: boolean }) =>
        `text-sm font-medium transition-colors px-3 py-2 rounded-md
    ${isActive
            ? "text-header-foreground font-semibold bg-white/15"
            : "text-header-foreground/85 hover:text-header-foreground hover:bg-white/10"}`

    const handleLogout = () => {
        logout();
        setIsDropdownOpen(false);
    };

    return (
        <>
            {/* Left Navigation - Desktop Only */}
            <nav className="hidden md:flex items-center gap-2 shrink-0">
                <NavLink to="/" end className={navLink}>
                    Inicio
                </NavLink>
                <NavLink to="/courses" className={navLink}>
                    Courses
                </NavLink>
                <NavLink to="/dashboard" className={navLink}>
                    Dashboard
                </NavLink>
                {isAdmin && <NavLink to="/admin" className={navLink}>Admin</NavLink>}
            </nav>

            {/* Spacer to push auth buttons to the right */}
            <div className="hidden md:block flex-1" />

            {/* Auth Buttons - Desktop Only */}
            <div className="hidden md:flex items-center gap-3 shrink-0 relative">
                {
                    user ? (
                        <div className="relative ">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="group flex items-center gap-2 rounded-full p-2 text-header-foreground/90 transition hover:bg-white/10 hover:text-header-foreground"
                            >
                                <User className="size-8" />
                                <span>
                                    {user.name}
                                </span>
                            </button>
                            {isDropdownOpen && (
                                <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-slate-800">
                                    <Link
                                        to="/settings"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="block px-4 py-2 text-sm text-slate-700 first:rounded-t-lg hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                    >
                                        Settings
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-2 border-t border-black/5 px-4 py-2 text-left text-sm text-slate-700 last:rounded-b-lg hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-700"
                                    >
                                        <LogOut className="size-4" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => setAuthType("Login")}
                                className="rounded-full border border-header-foreground/45 bg-white/10 px-4 py-1.5 text-sm font-medium text-header-foreground hover:bg-white/20"
                            >
                                Iniciar sesión
                            </button>
                            <button
                                onClick={() => setAuthType("Register")}
                                className="rounded-full bg-uned-accent px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-uned-accent-hover"
                            >
                                Registrarse
                            </button>
                        </>
                    )
                }
            </div>
        </>
    );
};