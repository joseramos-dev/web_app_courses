import { Link } from "react-router-dom";

const FOOTER_LINKS = [
    { to: "/courses", label: "Cursos" },
    { to: "/dashboard", label: "Dashboard" },
] as const;

/** Bloque informativo y enlaces: pie global (fondo cabecera UNED) */
export function FooterContentBar() {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <p className="font-display text-base font-semibold tracking-tight text-header-foreground">
                    kursa
                </p>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-header-foreground/80">
                    Proyecto académico (TFG). La identidad cromática se inspira en la web
                    pública de la UNED, sin uso de su logotipo ni recursos oficiales.
                </p>
            </div>
            <nav
                className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-header-foreground/90"
                aria-label="Pie de página"
            >
                {FOOTER_LINKS.map(({ to, label }) => (
                    <Link key={to} to={to} className="hover:text-header-foreground hover:underline">
                        {label}
                    </Link>
                ))}
                <a
                    href="https://www.uned.es/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-header-foreground hover:underline"
                >
                    UNED
                </a>
            </nav>
        </div>
    );
}

export function Footer() {
    return (
        <footer className="mt-auto border-t border-header-border bg-header text-header-foreground">
            <div className="mx-auto max-w-6xl px-4 py-6">
                <FooterContentBar />
                <p className="mt-6 text-center text-[11px] text-header-foreground/65">
                    © {new Date().getFullYear()} · Proyecto académico
                </p>
            </div>
        </footer>
    );
}
