import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../shared/povider/AuthContext";
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

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setEmailNew(user.email);
  }, [user]);

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
        Cuenta y apariencia
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

      <SettingsAppearanceSection />
    </div>
  );
}
