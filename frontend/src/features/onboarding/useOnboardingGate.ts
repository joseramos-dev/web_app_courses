import { useCallback, useEffect, useState } from "react";
import { get_preferences } from "../courses/api";
import { useAuth } from "../../shared/provider/AuthContext";
import { isOnboardingDismissed } from "../../shared/utils/onboardingDismissal";
import { hasAnyPreference } from "../../shared/utils/preferencesUtils";

/**
 * Decides whether to greet a student with the preferences onboarding.
 *
 * It opens only for students who have not picked a single preference, which is
 * exactly the state that makes the recommender return nothing. That condition
 * lives on the server, so there is no "first login" flag to keep in sync: an
 * empty preferences row *is* the signal.
 */
export function useOnboardingGate() {
    const { user, isLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const openOnboarding = useCallback(() => setIsOpen(true), []);
    const closeOnboarding = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        if (isLoading || !user || user.role !== "student") return;
        const userId = user.id;
        if (userId == null || isOnboardingDismissed(userId)) return;

        let cancelled = false;
        (async () => {
            try {
                const prefs = await get_preferences();
                if (!cancelled && !hasAnyPreference(prefs)) setIsOpen(true);
            } catch {
                // Never block the app because the check failed; the carousel's
                // empty state still offers a way in.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user, isLoading]);

    return { isOpen, openOnboarding, closeOnboarding, userId: user?.id ?? null };
}
