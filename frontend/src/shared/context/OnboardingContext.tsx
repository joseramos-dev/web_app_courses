import { createContext, useContext, type ReactNode } from "react";

/**
 * Lets any screen reopen the preferences onboarding, following the same
 * pattern as AuthModalContext. Needed because the empty state of the
 * recommendations carousel offers it too, not just the post-login gate.
 */
export type OnboardingContextValue = {
  openOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: OnboardingContextValue;
}) {
  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
