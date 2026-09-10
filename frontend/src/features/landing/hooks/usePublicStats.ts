import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_getPublicStats } from "../../dashboard/api";
import { formatCategoryLabel } from "../../../shared/components/charts/chartFormatters";
import type { ChartDatum } from "../../../shared/components/charts/chartTheme";
import type { IPublicStats } from "../../../shared/interfaces/IDashboard";
import {
    getLessonTypeLabels,
    type PublicStatsPeriod,
} from "../../../shared/types/LessonTypes";
import type { LessonType } from "../../course_edit/lessonTypes";

/** Translation key for the helper text describing each stats period. */
export const PERIOD_HELPER_KEY: Record<PublicStatsPeriod, string> = {
    day: "landing.period.day",
    week: "landing.period.week",
    month: "landing.period.month",
};

export interface UsePublicStatsResult {
    data: IPublicStats | null;
    loading: boolean;
    error: string | null;
    /** Locale-aware short date formatter (e.g. "05 Sep"), shared by the activity chart and its footer. */
    dayFormatter: Intl.DateTimeFormat;
    totalCategoryEnrollments: number;
    categoryChartData: ChartDatum[];
    lessonTypeChartData: ChartDatum[];
    activityChartData: ChartDatum[];
}

/**
 * Fetches the public landing-page statistics for the given period and shapes
 * them into the chart-ready data the landing sections render.
 *
 * Owns the fetch lifecycle (cancellation on period change/unmount, loading
 * and error state) plus the data transforms that used to live inline in
 * `LandingPage`.
 */
export function usePublicStats(period: PublicStatsPeriod): UsePublicStatsResult {
    const { t, i18n } = useTranslation();
    const lessonTypeLabels = getLessonTypeLabels(t);
    const dayFormatter = useMemo(
        () => new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "short" }),
        [i18n.language],
    );

    const [data, setData] = useState<IPublicStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await API_getPublicStats(period);
                if (!cancelled) setData(res);
            } catch (e) {
                console.error("Error loading public stats:", e);
                if (!cancelled)
                    setError(t("landing.loadStatsError"));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [period, t]);

    const totalCategoryEnrollments = useMemo(() => {
        if (!data) return 0;
        return data.category_distribution.reduce(
            (sum, c) => sum + c.enrollments_count,
            0,
        );
    }, [data]);

    const categoryChartData = useMemo<ChartDatum[]>(() => {
        if (!data) return [];
        return data.category_distribution.map((c) => ({
            label: formatCategoryLabel(c.category, t),
            value: c.enrollments_count,
        }));
    }, [data, t]);

    const lessonTypeChartData = useMemo<ChartDatum[]>(() => {
        if (!data) return [];
        return data.lesson_completions_by_type.map((row) => ({
            label:
                lessonTypeLabels[row.lesson_type as LessonType] ??
                row.lesson_type,
            value: row.completed_count,
        }));
    }, [data, lessonTypeLabels]);

    const activityChartData = useMemo<ChartDatum[]>(() => {
        if (!data) return [];
        return data.activity_series.map((d) => ({
            label: "",
            value: d.lessons_completed,
            title: dayFormatter.format(new Date(d.date)),
        }));
    }, [data, dayFormatter]);

    return {
        data,
        loading,
        error,
        dayFormatter,
        totalCategoryEnrollments,
        categoryChartData,
        lessonTypeChartData,
        activityChartData,
    };
}
