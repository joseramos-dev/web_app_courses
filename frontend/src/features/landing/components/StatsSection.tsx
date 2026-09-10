import { Activity, BookOpen, TrendingUp, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatCard } from "../../../shared/components/StatCard";
import type { IPublicStats } from "../../../shared/interfaces/IDashboard";
import type { PublicStatsPeriod } from "../../../shared/types/LessonTypes";
import { PERIOD_HELPER_KEY } from "../hooks/usePublicStats";

type Props = {
    data: IPublicStats;
    period: PublicStatsPeriod;
};

/** The four headline stat cards: catalog size, enrollments and period activity. */
export function StatsSection({ data, period }: Props) {
    const { t } = useTranslation();

    return (
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
                icon={<BookOpen className="size-5" />}
                label={t("landing.stats.coursesInCatalog")}
                value={String(data.courses_count)}
            />
            <StatCard
                icon={<TrendingUp className="size-5" />}
                label={t("landing.stats.totalEnrollments")}
                value={String(data.total_enrollments)}
            />
            <StatCard
                icon={<UserCheck className="size-5" />}
                label={t("landing.stats.activeEnrollments")}
                value={String(data.active_enrollments_count)}
                helper={t("landing.stats.activeEnrollmentsHelper")}
            />
            <StatCard
                icon={<Activity className="size-5" />}
                label={t("landing.stats.lessonsCompleted")}
                value={String(data.lessons_completed_in_period)}
                helper={t(PERIOD_HELPER_KEY[period]).toLowerCase()}
            />
        </section>
    );
}
