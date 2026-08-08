import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";

type Props = {
    /** "desktop": compact toggle for the top bar. "mobile": full-width row inside the hamburger menu. */
    variant?: "desktop" | "mobile";
};

function ThemeSwitch({
    isDark,
    onToggle,
    ariaLabel,
    className = "",
}: {
    isDark: boolean;
    onToggle: () => void;
    ariaLabel: string;
    className?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label={ariaLabel}
            onClick={onToggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${className} ${
                isDark ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
            }`}
        >
            <span
                className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${
                    isDark ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </button>
    );
}

export function ThemeToggle({ variant = "desktop" }: Props) {
    const { t } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    if (variant === "mobile") {
        return (
            <div className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
                    {t("nav.theme")}
                </span>
                <ThemeSwitch
                    isDark={isDark}
                    onToggle={toggleTheme}
                    ariaLabel={t("nav.toggleTheme")}
                />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            {isDark ? (
                <Moon className="size-5 text-header-foreground/90" aria-hidden />
            ) : (
                <Sun className="size-5 text-header-foreground/90" aria-hidden />
            )}
            <ThemeSwitch
                isDark={isDark}
                onToggle={toggleTheme}
                ariaLabel={t("nav.toggleTheme")}
                className={isDark ? "bg-emerald-500" : "bg-header-foreground/30"}
            />
        </div>
    );
}
