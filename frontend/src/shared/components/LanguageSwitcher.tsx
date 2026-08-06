import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import type { SupportedLanguage } from "../../i18n";
import { SUPPORTED_LANGUAGES } from "../../i18n";

const LANGUAGE_LABEL_KEY: Record<SupportedLanguage, string> = {
    es: "nav.spanish",
    en: "nav.english",
};

function normalizeLanguage(lng: string | undefined): SupportedLanguage {
    const base = (lng ?? "es").split("-")[0];
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(base)
        ? (base as SupportedLanguage)
        : "es";
}

type Props = {
    /** "desktop": compact icon+code chip. "mobile": full-width row, used inside the hamburger menu. */
    variant?: "desktop" | "mobile";
    onSelected?: () => void;
};

export function LanguageSwitcher({ variant = "desktop", onSelected }: Props) {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const current = normalizeLanguage(i18n.language);

    const handleSelect = (lng: SupportedLanguage) => {
        void i18n.changeLanguage(lng);
        setIsOpen(false);
        onSelected?.();
    };

    const options = (
        <div
            className={`z-50 rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-slate-800 ${
                variant === "desktop" ? "absolute right-0 mt-2 w-40" : "mt-1 w-full"
            }`}
        >
            {SUPPORTED_LANGUAGES.map((lng) => (
                <button
                    key={lng}
                    type="button"
                    onClick={() => handleSelect(lng)}
                    className={`block w-full px-4 py-2 text-left text-sm first:rounded-t-lg last:rounded-b-lg hover:bg-slate-100 dark:hover:bg-slate-700 ${
                        current === lng
                            ? "font-semibold text-uned-primary dark:text-uned-primary"
                            : "text-slate-700 dark:text-slate-200"
                    }`}
                >
                    {t(LANGUAGE_LABEL_KEY[lng])}
                </button>
            ))}
        </div>
    );

    if (variant === "mobile") {
        return (
            <div className="px-2 py-1">
                <button
                    type="button"
                    onClick={() => setIsOpen((open) => !open)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    <Globe className="size-4" />
                    {t("nav.language")}
                    <span className="ml-auto text-xs uppercase text-slate-400 dark:text-slate-500">
                        {current}
                    </span>
                </button>
                {isOpen && options}
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-label={t("nav.language")}
                className="group flex items-center gap-1.5 rounded-full p-2 text-header-foreground/90 transition hover:bg-white/10 hover:text-header-foreground"
            >
                <Globe className="size-5" />
                <span className="text-xs font-semibold uppercase">{current}</span>
            </button>
            {isOpen && options}
        </div>
    );
}
