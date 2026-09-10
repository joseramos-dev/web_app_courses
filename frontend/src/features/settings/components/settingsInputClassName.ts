type SettingsInputMargin = "mt-1" | "mt-2";

export function settingsInputClassName(options?: {
  marginTop?: SettingsInputMargin;
}): string {
  const marginTop = options?.marginTop ?? "mt-1";
  return `${marginTop} w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-uned-accent focus:outline-none focus:ring-2 focus:ring-uned-accent/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-uned-accent`;
}
