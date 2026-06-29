const COHORT_MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
});

export function formatCohortMonth(isoDate: string): string {
    return COHORT_MONTH_FORMATTER.format(new Date(isoDate));
}

export function formatCategoryLabel(category: string): string {
    if (category === "Non defined") return "Sin categoría";
    return category;
}
