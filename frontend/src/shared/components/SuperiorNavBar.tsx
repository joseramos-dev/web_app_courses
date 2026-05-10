import { Link } from "react-router-dom";
import type { AuthType } from "../types/AuthTypes";
import { ButtonsNavBar } from "./ButtonsNavBar";
import { ButtonsNavBarMobile } from "./ButtonsNavBarMobile";

export function SuperiorNavBar(
    { isAdmin, setAuthType }: { isAdmin: boolean, setAuthType: (authType: AuthType) => void }
) {
    return (
        <header className="sticky top-0 z-50 flex w-full flex-row border-b border-header-border bg-header text-header-foreground shadow-sm">
            <div className="mx-auto flex h-14 items-center px-4 w-full gap-4">
                {/* Left - Logo */}
                <div className="flex items-center shrink-0">
                    <Link
                        to="/" className="flex w-fit justify-center font-display text-xl font-semibold tracking-tight text-header-foreground">
                        kursa
                    </Link>
                </div>

                {/* Vertical Divider - Desktop Only */}
                <div className="hidden h-6 w-px bg-header-border md:bg-header-foreground/25 md:block" />

                {/* Desktop Navigation & Auth */}
                <ButtonsNavBar setAuthType={setAuthType} isAdmin={isAdmin}/>

                {/* Mobile Navigation */}
                <ButtonsNavBarMobile setAuthType={setAuthType} isAdmin={isAdmin}/>
            </div>
        </header>
    );
}





