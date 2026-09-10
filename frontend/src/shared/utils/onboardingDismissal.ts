/**
 * Remembers that a user dismissed the onboarding modal.
 *
 * Without this the modal would reappear on every login, since the trigger is
 * "no preferences set" and skipping leaves them unset. Stored per user id so
 * two accounts on the same browser do not inherit each other's choice.
 *
 * Deliberately client-side: it is a convenience, not a security boundary, and
 * seeing the prompt once more on a new device is harmless. Wrapped in
 * try/catch because localStorage throws in private-mode browsers.
 */
const KEY_PREFIX = "kursa:onboarding-dismissed:";

function key(userId: number): string {
    return `${KEY_PREFIX}${userId}`;
}

export function isOnboardingDismissed(userId: number): boolean {
    try {
        return localStorage.getItem(key(userId)) === "1";
    } catch {
        return false;
    }
}

export function dismissOnboarding(userId: number): void {
    try {
        localStorage.setItem(key(userId), "1");
    } catch {
        // Ignore: the modal will simply be offered again next time.
    }
}
