import { useTheme } from "../../../shared/context/ThemeContext";
import { settingsMutedHintClassName } from "./settingsMutedHintClassName";
import { settingsSectionCardClassName } from "./settingsSectionCardClassName";
import { settingsSectionTitleClassName } from "./settingsSectionTitleClassName";

export function SettingsAppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section className={settingsSectionCardClassName()}>
      <h2 className={settingsSectionTitleClassName()}>Apariencia</h2>
      <p className={settingsMutedHintClassName()}>
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
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            theme === "dark" ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${
              theme === "dark" ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
