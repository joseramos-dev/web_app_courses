import { useMemo } from "react";
import type { IInstructorCourseStudents } from "../../shared/interfaces/IInstructorCourseStudents";
import type { ChartDatum } from "../../shared/components/charts/chartTheme";
import type { LessonCompletionDatum } from "../../shared/components/charts/LessonCompletionChart";
import type { CohortChartDatum } from "../../shared/components/charts/CohortComparisonChart";
import { formatCohortMonth } from "../../shared/components/charts/chartFormatters";

type CourseStudentsChartData = {
    lessonChartData: LessonCompletionDatum[];
    progressBucketData: ChartDatum[];
    cohortChartData: CohortChartDatum[];
};

/**
 * Shapes the raw instructor course-students payload into the datum types
 * expected by the summary charts rendered on the course students page.
 */
export function useCourseStudentsCharts(
    data: IInstructorCourseStudents | null,
): CourseStudentsChartData {
    const lessonChartData = useMemo(() => {
        if (!data) return [];
        return data.lesson_stats.map((lesson) => ({
            label: `#${lesson.position}`,
            value: lesson.completed_count,
            title: lesson.lesson_title,
            completionRate: lesson.completion_rate,
        }));
    }, [data]);

    const progressBucketData = useMemo(() => {
        if (!data) return [];
        return data.progress_buckets.map((bucket) => ({
            label: bucket.label,
            value: bucket.count,
        }));
    }, [data]);

    const cohortChartData = useMemo(() => {
        if (!data) return [];
        return data.cohorts.map((cohort) => ({
            label: formatCohortMonth(cohort.cohort_month),
            enrollments_count: cohort.enrollments_count,
            avg_progress_percent: cohort.avg_progress_percent,
            completion_rate: cohort.completion_rate,
        }));
    }, [data]);

    return { lessonChartData, progressBucketData, cohortChartData };
}
