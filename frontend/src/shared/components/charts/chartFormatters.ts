export function formatCohortMonth(isoDate: string, locale?: string): string {
    return new Intl.DateTimeFormat(locale, {
        month: "short",
        year: "numeric",
    }).format(new Date(isoDate));
}

export function formatCategoryLabel(
    category: string,
    t: (key: string) => string,
): string {
    if (category === "Non defined") return t("domain.category.notDefined");
    return category;
}
