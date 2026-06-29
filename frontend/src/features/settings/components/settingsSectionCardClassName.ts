export function settingsSectionCardClassName(options?: {
  isFirst?: boolean;
  noTopMargin?: boolean;
}): string {
  const top = options?.noTopMargin
    ? ""
    : options?.isFirst
      ? "mt-8"
      : "mt-6";
  return `${top} rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900`.trim();
}
