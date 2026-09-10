import { useState } from "react";
import { XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { AuxCard } from "../auth/Auth";
import { patch_preferences } from "../courses/api";
import { runWithToastSaving } from "../../shared/utils/runWithToastSaving";
import { PreferencesSelector } from "../../shared/components/PreferencesSelector";
import type { IRecommendationPreferencesUpdate } from "../../shared/interfaces/IRecommendation";
import { dismissOnboarding } from "../../shared/utils/onboardingDismissal";
import { EMPTY_PREFERENCES, hasAnyPreference } from "../../shared/utils/preferencesUtils";

type Props = {
    userId: number;
    onClose: () => void;
};

/**
 * First-run prompt asking a student for the interests the recommender needs.
 *
 * Reuses the very same PreferencesSelector as the settings page, so both
 * screens stay in sync automatically, and `patch_preferences` already
 * invalidates the cached recommendations on success.
 */
export function OnboardingPreferencesModal({ userId, onClose }: Props) {
    const { t } = useTranslation();
    const [prefs, setPrefs] = useState<IRecommendationPreferencesUpdate>(EMPTY_PREFERENCES);
    const [saving, setSaving] = useState(false);

    // Skipping is remembered so the prompt does not return on every login:
    // the trigger is "no preferences set", which skipping leaves unchanged.
    const handleSkip = () => {
        dismissOnboarding(userId);
        onClose();
    };

    const handleSave = async () => {
        if (!hasAnyPreference(prefs)) {
            toast.error(t("onboarding.errors.empty"));
            return;
        }
        const updated = await runWithToastSaving(
            setSaving,
            () => patch_preferences(prefs),
            t("onboarding.errors.saveFailed"),
        );
        if (!updated) return;
        dismissOnboarding(userId);
        toast.success(t("onboarding.toast.saved"));
        onClose();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            onClick={handleSkip}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto backdrop-blur-xs p-4"
        >
            <AuxCard sizeClassName="w-full max-w-3xl p-6 sm:p-8 my-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1
                            id="onboarding-title"
                            className="text-2xl font-bold text-gray-900 dark:text-slate-100"
                        >
                            {t("onboarding.title")}
                        </h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                            {t("onboarding.description")}
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label={t("onboarding.skip")}
                        onClick={handleSkip}
                        className="shrink-0 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="mt-6">
                    <PreferencesSelector
                        value={prefs}
                        onChange={setPrefs}
                        disabled={saving}
                    />
                </div>

                <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={handleSkip}
                        disabled={saving}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        {t("onboarding.skip")}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={saving}
                        className="rounded-lg bg-uned-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-uned-primary-hover disabled:opacity-60"
                    >
                        {saving ? t("common.saving") : t("onboarding.save")}
                    </button>
                </div>
            </AuxCard>
        </div>
    );
}
