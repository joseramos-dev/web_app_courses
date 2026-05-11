type LabelMargin = "mt-1" | "mt-3";

export function settingsFieldLabelClassName(options?: {
  marginTopClass?: LabelMargin;
}): string {
  const marginTopClass = options?.marginTopClass ?? "mt-3";
  return `${marginTopClass} block text-xs font-medium text-slate-600 dark:text-slate-400`;
}
