import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../shared/povider/AuthContext";
import { useTheme } from "../../shared/context/ThemeContext";
import { API_patchMe } from "./api";

export function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

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
    try {
      setSavingName(true);
      const updated = await API_patchMe({ name: trimmed });
      updateUser(updated);
      toast.success("Nombre actualizado");
    } catch (e) {
      console.error(e);
      toast.error(typeof e === "string" ? e : "No se pudo actualizar el nombre");
    } finally {
      setSavingName(false);
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
    try {
      setSavingEmail(true);
      const updated = await API_patchMe({
        email: trimmed,
        current_password: emailCurrentPwd,
      });
      updateUser(updated);
      setEmailCurrentPwd("");
      toast.success("Email actualizado");
    } catch (e) {
      console.error(e);
      toast.error(typeof e === "string" ? e : "No se pudo actualizar el email");
    } finally {
      setSavingEmail(false);
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
    try {
      setSavingPwd(true);
      await API_patchMe({
        current_password: pwdCurrent,
        new_password: pwdNew,
      });
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      toast.success("Contraseña actualizada");
    } catch (e) {
      console.error(e);
      toast.error(typeof e === "string" ? e : "No se pudo actualizar la contraseña");
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Ajustes
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Cuenta y apariencia
      </p>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Nombre
        </h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          disabled={savingName}
          onClick={() => void handleSaveName()}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {savingName ? "Guardando…" : "Guardar nombre"}
        </button>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Email
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Actual: {email}
        </p>
        <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Nuevo email
        </label>
        <input
          type="email"
          value={emailNew}
          onChange={(e) => setEmailNew(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Contraseña actual (obligatoria)
        </label>
        <input
          type="password"
          value={emailCurrentPwd}
          onChange={(e) => setEmailCurrentPwd(e.target.value)}
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          disabled={savingEmail}
          onClick={() => void handleSaveEmail()}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {savingEmail ? "Guardando…" : "Guardar email"}
        </button>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Contraseña
        </h2>
        <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Contraseña actual
        </label>
        <input
          type="password"
          value={pwdCurrent}
          onChange={(e) => setPwdCurrent(e.target.value)}
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Nueva contraseña
        </label>
        <input
          type="password"
          value={pwdNew}
          onChange={(e) => setPwdNew(e.target.value)}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Confirmar nueva contraseña
        </label>
        <input
          type="password"
          value={pwdConfirm}
          onChange={(e) => setPwdConfirm(e.target.value)}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          disabled={savingPwd}
          onClick={() => void handleSavePassword()}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {savingPwd ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Apariencia
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          El modo se guarda en este dispositivo.
        </p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Modo oscuro
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${theme === "dark" ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-5" : "translate-x-0"
                }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
