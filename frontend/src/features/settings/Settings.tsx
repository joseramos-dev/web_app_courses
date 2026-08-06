import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/povider/AuthContext";
import { get_preferences, patch_preferences } from "../courses/api";
import type { IRecommendationPreferencesUpdate } from "../../shared/interfaces/IRecommendation";
import { PreferencesSelector } from "../../shared/components/PreferencesSelector";
import { API_patchMe } from "./api";
import { runWithToastSaving } from "./components/runWithToastSaving";
import { SettingsAppearanceSection } from "./components/SettingsAppearanceSection";
import { settingsFieldLabelClassName } from "./components/settingsFieldLabelClassName";
import { settingsInputClassName } from "./components/settingsInputClassName";
import { settingsMutedHintClassName } from "./components/settingsMutedHintClassName";
import { settingsPrimaryButtonClassName } from "./components/settingsPrimaryButtonClassName";
import { settingsSectionCardClassName } from "./components/settingsSectionCardClassName";
import { settingsSectionTitleClassName } from "./components/settingsSectionTitleClassName";

export function Settings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [emailNew, setEmailNew] = useState("");
  const [emailCurrentPwd, setEmailCurrentPwd] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const isStudent = user?.role === "student";
  const [prefs, setPrefs] = useState<IRecommendationPreferencesUpdate>({
    preferred_sites: [],
    preferred_categories: [],
    preferred_languages: [],
    preferred_course_types: [],
    preferred_duration_buckets: [],
    preferred_difficulties: [],
  });
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setEmailNew(user.email);
  }, [user]);

  useEffect(() => {
    if (!isStudent) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingPrefs(true);
        const data = await get_preferences();
        if (!cancelled) {
          setPrefs({
            preferred_sites: data.preferred_sites,
            preferred_categories: data.preferred_categories,
            preferred_languages: data.preferred_languages,
            preferred_course_types: data.preferred_course_types,
            preferred_duration_buckets: data.preferred_duration_buckets,
            preferred_difficulties: data.preferred_difficulties,
          });
        }
      } catch (e) {
        console.error("Error loading preferences:", e);
        if (!cancelled) toast.error(t("settings.toast.loadPreferencesFailed"));
      } finally {
        if (!cancelled) setLoadingPrefs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isStudent, t]);

  if (!user) return null;

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("settings.toast.nameEmpty"));
      return;
    }
    if (trimmed === user.name) {
      toast(t("settings.toast.nameUnchanged"));
      return;
    }
    const updated = await runWithToastSaving(
      setSavingName,
      () => API_patchMe({ name: trimmed }),
      t("settings.toast.nameUpdateFailed"),
    );
    if (updated) {
      updateUser(updated);
      toast.success(t("settings.toast.nameUpdated"));
    }
  };

  const handleSaveEmail = async () => {
    const trimmed = emailNew.trim();
    if (!trimmed) {
      toast.error(t("settings.toast.emailEmpty"));
      return;
    }
    if (trimmed === user.email) {
      toast(t("settings.toast.emailUnchanged"));
      return;
    }
    if (!emailCurrentPwd) {
      toast.error(t("settings.toast.emailPasswordRequired"));
      return;
    }
    const updated = await runWithToastSaving(
      setSavingEmail,
      () =>
        API_patchMe({
          email: trimmed,
          current_password: emailCurrentPwd,
        }),
      t("settings.toast.emailUpdateFailed"),
    );
    if (updated) {
      updateUser(updated);
      setEmailCurrentPwd("");
      toast.success(t("settings.toast.emailUpdated"));
    }
  };

  const handleSavePassword = async () => {
    if (!pwdCurrent) {
      toast.error(t("settings.toast.passwordCurrentRequired"));
      return;
    }
    if (pwdNew.length < 6) {
      toast.error(t("settings.toast.passwordTooShort"));
      return;
    }
    if (pwdNew !== pwdConfirm) {
      toast.error(t("settings.toast.passwordMismatch"));
      return;
    }
    const ok = await runWithToastSaving(
      setSavingPwd,
      () =>
        API_patchMe({
          current_password: pwdCurrent,
          new_password: pwdNew,
        }),
      t("settings.toast.passwordUpdateFailed"),
    );
    if (ok !== undefined) {
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      toast.success(t("settings.toast.passwordUpdated"));
    }
  };

  const handleSavePreferences = async () => {
    const hasAny =
      (prefs.preferred_sites?.length ?? 0) > 0 ||
      (prefs.preferred_categories?.length ?? 0) > 0 ||
      (prefs.preferred_languages?.length ?? 0) > 0 ||
      (prefs.preferred_course_types?.length ?? 0) > 0 ||
      (prefs.preferred_duration_buckets?.length ?? 0) > 0 ||
      (prefs.preferred_difficulties?.length ?? 0) > 0;
    if (!hasAny) {
      toast.error(t("settings.toast.preferencesEmpty"));
      return;
    }

    const updated = await runWithToastSaving(
      setSavingPrefs,
      () => patch_preferences(prefs),
      t("settings.toast.preferencesSaveFailed"),
    );
    if (updated) {
      setPrefs({
        preferred_sites: updated.preferred_sites,
        preferred_categories: updated.preferred_categories,
        preferred_languages: updated.preferred_languages,
        preferred_course_types: updated.preferred_course_types,
        preferred_duration_buckets: updated.preferred_duration_buckets,
        preferred_difficulties: updated.preferred_difficulties,
      });
      toast.success(t("settings.toast.preferencesSaved"));
    }
  };

  const inputCn = settingsInputClassName;
  const labelCn = settingsFieldLabelClassName;
  const btnCn = settingsPrimaryButtonClassName();
  const cardCn = settingsSectionCardClassName({ noTopMargin: true });
  const titleCn = settingsSectionTitleClassName();
  const hintCn = settingsMutedHintClassName();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {t("settings.title")}
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {isStudent
          ? t("settings.subtitleStudent")
          : t("settings.subtitleDefault")}
      </p>

      <div
        className={`mt-8 grid grid-cols-1 gap-8 ${isStudent ? "lg:grid-cols-2 lg:items-start" : "max-w-3xl"}`}
      >
        <div className="space-y-6">
          <section className={cardCn}>
            <h2 className={titleCn}>{t("settings.name.title")}</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCn({ marginTop: "mt-2" })}
            />
            <button
              type="button"
              disabled={savingName}
              onClick={() => void handleSaveName()}
              className={btnCn}
            >
              {savingName ? t("common.saving") : t("settings.name.save")}
            </button>
          </section>

          <section className={cardCn}>
            <h2 className={titleCn}>{t("settings.email.title")}</h2>
            <p className={hintCn}>{t("settings.email.current", { email })}</p>
            <label className={labelCn()}>{t("settings.email.newLabel")}</label>
            <input
              type="email"
              value={emailNew}
              onChange={(e) => setEmailNew(e.target.value)}
              className={inputCn()}
            />
            <label className={labelCn()}>{t("settings.email.currentPasswordLabel")}</label>
            <input
              type="password"
              value={emailCurrentPwd}
              onChange={(e) => setEmailCurrentPwd(e.target.value)}
              autoComplete="current-password"
              className={inputCn()}
            />
            <button
              type="button"
              disabled={savingEmail}
              onClick={() => void handleSaveEmail()}
              className={btnCn}
            >
              {savingEmail ? t("common.saving") : t("settings.email.save")}
            </button>
          </section>

          <section className={cardCn}>
            <h2 className={titleCn}>{t("settings.password.title")}</h2>
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <label className={labelCn()}>{t("settings.password.currentLabel")}</label>
                <input
                  type="password"
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(e.target.value)}
                  autoComplete="current-password"
                  className={inputCn()}
                />
              </div>
              <div>
                <label className={labelCn()}>{t("settings.password.newLabel")}</label>
                <input
                  type="password"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  autoComplete="new-password"
                  className={inputCn()}
                />
              </div>
            </div>
            <label className={labelCn()}>{t("settings.password.confirmLabel")}</label>
            <input
              type="password"
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              autoComplete="new-password"
              className={inputCn()}
            />
            <button
              type="button"
              disabled={savingPwd}
              onClick={() => void handleSavePassword()}
              className={btnCn}
            >
              {savingPwd ? t("common.saving") : t("settings.password.save")}
            </button>
          </section>

          {!isStudent ? <SettingsAppearanceSection noTopMargin /> : null}
        </div>

        {isStudent ? (
          <div className="space-y-6">
            <section id="recommendation-preferences" className={cardCn}>
              <h2 className={titleCn}>{t("settings.recommendations.title")}</h2>
              <p className={hintCn}>
                {t("settings.recommendations.hint")}
              </p>
              {loadingPrefs ? (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  {t("settings.recommendations.loading")}
                </p>
              ) : (
                <>
                  <div className="mt-4">
                    <PreferencesSelector
                      value={prefs}
                      onChange={setPrefs}
                      disabled={savingPrefs}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingPrefs}
                    onClick={() => void handleSavePreferences()}
                    className={btnCn}
                  >
                    {savingPrefs ? t("common.saving") : t("settings.recommendations.save")}
                  </button>
                </>
              )}
            </section>

            <SettingsAppearanceSection noTopMargin />
          </div>
        ) : null}
      </div>
    </div>
  );
}
