export function settingsSectionCardClassName(options?: {
  isFirst?: boolean;
}): string {
  const top = options?.isFirst ? "mt-8" : "mt-6";
  return `${top} rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900`;
}
