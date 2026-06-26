import { useEffect, useState } from "react";
import toast from "react-hot-toast";
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

  const canManagePreferences =
    user?.role === "student" || user?.role === "admin";
  const [prefs, setPrefs] = useState<IRecommendationPreferencesUpdate>({
    preferred_sites: [],
    preferred_categories: [],
    preferred_languages: [],
    preferred_course_types: [],
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
    if (!canManagePreferences) return;

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
          });
        }
      } catch (e) {
        console.error("Error loading preferences:", e);
        if (!cancelled) toast.error("No se pudieron cargar las preferencias.");
      } finally {
        if (!cancelled) setLoadingPrefs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canManagePreferences]);

  if (!user) return null;

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    if (trimmed === user.name) {
      toast("Sin cambios en el nombre");
      return;
    }
    const updated = await runWithToastSaving(
      setSavingName,
      () => API_patchMe({ name: trimmed }),
      "No se pudo actualizar el nombre",
    );
    if (updated) {
      updateUser(updated);
      toast.success("Nombre actualizado");
    }
  };

  const handleSaveEmail = async () => {
    const trimmed = emailNew.trim();
    if (!trimmed) {
      toast.error("El email no puede estar vacío");
      return;
    }
    if (trimmed === user.email) {
      toast("Sin cambios en el email");
      return;
    }
    if (!emailCurrentPwd) {
      toast.error("Introduce tu contraseña actual para cambiar el email");
      return;
    }
    const updated = await runWithToastSaving(
      setSavingEmail,
      () =>
        API_patchMe({
          email: trimmed,
          current_password: emailCurrentPwd,
        }),
      "No se pudo actualizar el email",
    );
    if (updated) {
      updateUser(updated);
      setEmailCurrentPwd("");
      toast.success("Email actualizado");
    }
  };

  const handleSavePassword = async () => {
    if (!pwdCurrent) {
      toast.error("Introduce tu contraseña actual");
      return;
    }
    if (pwdNew.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }
    const ok = await runWithToastSaving(
      setSavingPwd,
      () =>
        API_patchMe({
          current_password: pwdCurrent,
          new_password: pwdNew,
        }),
      "No se pudo actualizar la contraseña",
    );
    if (ok !== undefined) {
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      toast.success("Contraseña actualizada");
    }
  };

  const handleSavePreferences = async () => {
    const hasAny =
      (prefs.preferred_sites?.length ?? 0) > 0 ||
      (prefs.preferred_categories?.length ?? 0) > 0 ||
      (prefs.preferred_languages?.length ?? 0) > 0 ||
      (prefs.preferred_course_types?.length ?? 0) > 0;
    if (!hasAny) {
      toast.error("Selecciona al menos una preferencia");
      return;
    }

    const updated = await runWithToastSaving(
      setSavingPrefs,
      () => patch_preferences(prefs),
      "No se pudieron guardar las preferencias",
    );
    if (updated) {
      setPrefs({
        preferred_sites: updated.preferred_sites,
        preferred_categories: updated.preferred_categories,
        preferred_languages: updated.preferred_languages,
        preferred_course_types: updated.preferred_course_types,
      });
      toast.success("Preferencias guardadas");
    }
  };

  const inputCn = settingsInputClassName;
  const labelCn = settingsFieldLabelClassName;
  const btnCn = settingsPrimaryButtonClassName();
  const sectionCn = settingsSectionCardClassName;
  const titleCn = settingsSectionTitleClassName();
  const hintCn = settingsMutedHintClassName();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Ajustes
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Cuenta, recomendaciones y apariencia
      </p>

      <section className={sectionCn({ isFirst: true })}>
        <h2 className={titleCn}>Nombre</h2>
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
          {savingName ? "Guardando…" : "Guardar nombre"}
        </button>
      </section>

      <section className={sectionCn()}>
        <h2 className={titleCn}>Email</h2>
        <p className={hintCn}>Actual: {email}</p>
        <label className={labelCn()}>Nuevo email</label>
        <input
          type="email"
          value={emailNew}
          onChange={(e) => setEmailNew(e.target.value)}
          className={inputCn()}
        />
        <label className={labelCn()}>Contraseña actual (obligatoria)</label>
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
          {savingEmail ? "Guardando…" : "Guardar email"}
        </button>
      </section>

      <section className={sectionCn()}>
        <h2 className={titleCn}>Contraseña</h2>
        <label className={labelCn()}>Contraseña actual</label>
        <input
          type="password"
          value={pwdCurrent}
          onChange={(e) => setPwdCurrent(e.target.value)}
          autoComplete="current-password"
          className={inputCn()}
        />
        <label className={labelCn()}>Nueva contraseña</label>
        <input
          type="password"
          value={pwdNew}
          onChange={(e) => setPwdNew(e.target.value)}
          autoComplete="new-password"
          className={inputCn()}
        />
        <label className={labelCn()}>Confirmar nueva contraseña</label>
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
          {savingPwd ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </section>

      {canManagePreferences ? (
        <section id="recommendation-preferences" className={sectionCn()}>
          <h2 className={titleCn}>Preferencias de recomendación</h2>
          <p className={hintCn}>
            Estas opciones alimentan el recomendador de cursos en tu dashboard y
            en el catálogo.
          </p>
          {loadingPrefs ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Cargando preferencias…
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
                {savingPrefs ? "Guardando…" : "Guardar preferencias"}
              </button>
            </>
          )}
        </section>
      ) : null}

      <SettingsAppearanceSection />
    </div>
  );
}
