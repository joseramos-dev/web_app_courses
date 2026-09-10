import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { CourseCard } from "../../features/courses/components/CourseCard";
import { CourseCardSkeleton } from "../../features/courses/components/CourseCardSkeleton";
import { get_recommended } from "../../features/courses/api";
import { invalidateRecommendationsCache } from "../utils/recommendationsCache";
import type { ICourseRecommendation, RecommendationSourceType } from "../interfaces/IRecommendation";
import { useAuth } from "../provider/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";

/** Fixed carousel track height (badge row + card slot). */
const CAROUSEL_ROW_HEIGHT = "h-[26rem]";
const CAROUSEL_CARD_SLOT_HEIGHT = "h-[22rem]";

const NAV_BUTTON_CLASS =
    "flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

function recommendationSourceLabel(source: RecommendationSourceType, t: TFunction): string {
    if (source === "collaborative") return t("courses.recommended.sourceCollaborative");
    if (source === "history") return t("courses.recommended.sourceHistory");
    if (source === "hybrid") return t("courses.recommended.sourceHybrid");
    return t("courses.recommended.sourceContent");
}

function recommendationSourceTitle(source: RecommendationSourceType, t: TFunction): string {
    if (source === "collaborative") return t("courses.recommended.titleCollaborative");
    if (source === "hybrid") return t("courses.recommended.titleHybrid");
    return t("courses.recommended.titleContent");
}

function visibleCountForWidth(width: number): number {
    if (width >= 900) return 4;
    if (width >= 480) return 2;
    return 1;
}

function cardBasisForVisibleCount(visibleCount: number): string {
    if (visibleCount === 1) return "basis-full";
    if (visibleCount === 2) return "basis-[calc(50%-0.5rem)]";
    return "basis-[calc(25%-0.75rem)]";
}

function pageCountFor(itemCount: number, visibleCount: number): number {
    if (itemCount <= visibleCount) return 1;
    return Math.ceil(itemCount / visibleCount);
}

function currentPageIndex(
    startIndex: number,
    visibleCount: number,
    totalPages: number,
): number {
    if (totalPages <= 1) return 0;
    return Math.floor(startIndex / visibleCount) % totalPages;
}

function circularSlice<T>(items: T[], startIndex: number, count: number): T[] {
    if (items.length === 0) return [];
    const take = Math.min(count, items.length);
    return Array.from({ length: take }, (_, i) => items[(startIndex + i) % items.length]);
}

const RELOAD_BUTTON_CLASS =
    "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

type SectionShellProps = {
    title: string;
    className?: string;
    ariaLabel?: string;
    headerAction?: ReactNode;
    children: ReactNode;
};

function CarouselSectionShell({ title, className = "", ariaLabel, headerAction, children }: SectionShellProps) {
    return (
        <section className={className} aria-label={ariaLabel ?? title}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {title}
                </h2>
                {headerAction}
            </div>
            {children}
        </section>
    );
}

function renderReloadButton(
    t: TFunction,
    onReload: () => void,
    refreshing: boolean,
) {
    return (
        <button
            type="button"
            onClick={onReload}
            disabled={refreshing}
            aria-label={t("courses.recommended.reloadAria")}
            className={RELOAD_BUTTON_CLASS}
        >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            <span>{t("courses.recommended.reload")}</span>
        </button>
    );
}

function renderLoadingState(title: string, className: string, t: TFunction) {
    const skeletonCount = 4;
    const cardBasis = cardBasisForVisibleCount(skeletonCount);

    return (
        <CarouselSectionShell title={title} className={className} ariaLabel={t("courses.recommended.loading")}>
            <div
                className={`flex items-center gap-2 sm:gap-3 ${CAROUSEL_ROW_HEIGHT}`}
                role="status"
                aria-label={t("courses.recommended.loading")}
            >
                <button
                    type="button"
                    disabled
                    aria-hidden
                    className={`${NAV_BUTTON_CLASS} invisible sm:visible`}
                >
                    <ChevronLeft className="size-5" />
                </button>

                <div className="flex h-full min-w-0 flex-1 items-stretch gap-4 overflow-hidden">
                    {Array.from({ length: skeletonCount }, (_, index) => (
                        <div
                            key={index}
                            className={`flex h-full min-w-0 shrink-0 grow-0 flex-col ${cardBasis}`}
                        >
                            <div className="mb-2 flex h-7 shrink-0 items-center justify-end gap-1.5">
                                <div className="skeleton-shimmer h-5 w-16 rounded-full" aria-hidden />
                                <div className="skeleton-shimmer h-5 w-20 rounded-full" aria-hidden />
                            </div>
                            <div className={`${CAROUSEL_CARD_SLOT_HEIGHT} shrink-0 overflow-hidden`}>
                                <CourseCardSkeleton />
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    disabled
                    aria-hidden
                    className={`${NAV_BUTTON_CLASS} invisible sm:visible`}
                >
                    <ChevronRight className="size-5" />
                </button>
            </div>
        </CarouselSectionShell>
    );
}

function renderErrorState(
    title: string,
    className: string,
    error: string,
    headerAction?: ReactNode,
) {
    return (
        <CarouselSectionShell title={title} className={className} headerAction={headerAction}>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </CarouselSectionShell>
    );
}

function renderEmptyState(
    title: string,
    className: string,
    t: TFunction,
    onConfigure: () => void,
    headerAction?: ReactNode,
) {
    return (
        <CarouselSectionShell title={title} className={className} headerAction={headerAction}>
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-slate-600 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {t("courses.recommended.emptyTitle")}
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                    {t("courses.recommended.emptyDescription")}
                </p>
                <button
                    type="button"
                    onClick={onConfigure}
                    className="mt-5 inline-flex items-center rounded-lg bg-uned-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-uned-primary-hover"
                >
                    {t("courses.recommended.configurePreferences")}
                </button>
            </div>
        </CarouselSectionShell>
    );
}

type CarouselTrackProps = {
    title: string;
    className: string;
    containerRef: RefObject<HTMLDivElement | null>;
    visibleRecommendations: ICourseRecommendation[];
    startIndex: number;
    visibleCount: number;
    itemCount: number;
    pageCount: number;
    currentPage: number;
    onPrev: () => void;
    onNext: () => void;
    onGoToPage: (page: number) => void;
    headerAction?: ReactNode;
};

function renderRecommendationsCarousel({
    title,
    className,
    containerRef,
    visibleRecommendations,
    startIndex,
    visibleCount,
    itemCount,
    pageCount,
    currentPage,
    onPrev,
    onNext,
    onGoToPage,
    headerAction,
    t,
}: CarouselTrackProps & { t: TFunction }) {
    const cardBasis = cardBasisForVisibleCount(visibleCount);

    return (
        <CarouselSectionShell title={title} className={className} headerAction={headerAction}>
            <div className={`flex items-center gap-2 sm:gap-3 ${CAROUSEL_ROW_HEIGHT}`}>
                <button
                    type="button"
                    onClick={onPrev}
                    disabled={itemCount === 0}
                    aria-label={t("courses.recommended.prevAria")}
                    className={NAV_BUTTON_CLASS}
                >
                    <ChevronLeft className="size-5" />
                </button>

                <div
                    ref={containerRef}
                    className="flex h-full min-w-0 flex-1 items-stretch gap-4 overflow-hidden"
                >
                    {visibleRecommendations.map((rec, idx) => (
                        <div
                            key={`${rec.course.id}-${startIndex + idx}`}
                            className={`flex h-full min-w-0 shrink-0 grow-0 flex-col ${cardBasis}`}
                        >
                            <div className="mb-2 flex h-7 shrink-0 items-center justify-end gap-1.5">
                                <span className="rounded-full bg-uned-primary/10 px-2.5 py-0.5 text-xs font-semibold text-uned-primary dark:bg-uned-primary/20">
                                    {t("courses.recommended.matchPercent", {
                                        percent: rec.recommendation_percent,
                                    })}
                                </span>
                                <span
                                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                                    title={recommendationSourceTitle(rec.source_type, t)}
                                >
                                    {recommendationSourceLabel(rec.source_type, t)}
                                </span>
                            </div>
                            <div
                                className={`${CAROUSEL_CARD_SLOT_HEIGHT} shrink-0 overflow-hidden [&_article]:h-full [&_article]:overflow-hidden [&_article_h2]:line-clamp-2`}
                            >
                                <CourseCard course={rec.course} />
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={onNext}
                    disabled={itemCount === 0}
                    aria-label={t("courses.recommended.nextAria")}
                    className={NAV_BUTTON_CLASS}
                >
                    <ChevronRight className="size-5" />
                </button>
            </div>

            {pageCount > 1 ? (
                <div
                    className="mt-4 flex justify-center gap-2"
                    role="tablist"
                    aria-label={t("courses.recommended.pagesAria")}
                >
                    {Array.from({ length: pageCount }, (_, page) => (
                        <button
                            key={page}
                            type="button"
                            role="tab"
                            aria-selected={page === currentPage}
                            aria-label={t("courses.recommended.pageAria", {
                                page: page + 1,
                                total: pageCount,
                            })}
                            onClick={() => onGoToPage(page)}
                            className={`size-2 rounded-full transition-colors ${
                                page === currentPage
                                    ? "bg-uned-primary"
                                    : "bg-gray-300 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-500"
                            }`}
                        />
                    ))}
                </div>
            ) : null}
        </CarouselSectionShell>
    );
}

type RecommendedCoursesCarouselProps = {
    fetchLimit?: number;
    title?: string;
    className?: string;
    /** When true, admins do not see this block (e.g. on /courses). */
    hideForAdmin?: boolean;
};

export function RecommendedCoursesCarousel({
    fetchLimit = 16,
    title,
    className = "",
    hideForAdmin = false,
}: RecommendedCoursesCarouselProps) {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t("courses.recommended.title");
    const { user, isLoading: isAuthLoading } = useAuth();
    const { openOnboarding } = useOnboarding();
    const containerRef = useRef<HTMLDivElement>(null);
    const [recommendations, setRecommendations] = useState<ICourseRecommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startIndex, setStartIndex] = useState(0);
    const [visibleCount, setVisibleCount] = useState(4);
    const [fetchDone, setFetchDone] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const hasLoadedOnceRef = useRef(false);

    const canShow =
        !isAuthLoading &&
        user != null &&
        (user.role === "student" || (user.role === "admin" && !hideForAdmin));

    const loadRecommendations = useCallback(
        async (forceRefresh = false, excludeCourseIds?: number[]) => {
            if (user?.id == null) return;

            const isInitialLoad = !hasLoadedOnceRef.current && !forceRefresh;
            try {
                if (forceRefresh) {
                    invalidateRecommendationsCache();
                    setRecommendations([]);
                    setStartIndex(0);
                    setFetchDone(false);
                    setLoading(true);
                } else if (isInitialLoad) {
                    setLoading(true);
                    setFetchDone(false);
                } else {
                    setRefreshing(true);
                }
                setError(null);

                const res = await get_recommended(fetchLimit, user.id, {
                    forceRefresh,
                    excludeCourseIds,
                });
                setRecommendations(res.recommendations);
                setStartIndex(0);
                setFetchDone(true);
                hasLoadedOnceRef.current = true;
            } catch (e) {
                console.error("Error fetching recommended courses:", e);
                const isTimeout =
                    axios.isAxiosError(e) &&
                    (e.code === "ECONNABORTED" || e.message.includes("timeout"));
                setError(
                    isTimeout
                        ? t("courses.recommended.timeout")
                        : t("courses.recommended.error"),
                );
                setFetchDone(true);
                hasLoadedOnceRef.current = true;
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [fetchLimit, t, user?.id],
    );

    useEffect(() => {
        hasLoadedOnceRef.current = false;
        setRecommendations([]);
        setStartIndex(0);
        setFetchDone(false);
        setError(null);
    }, [user?.id]);

    useEffect(() => {
        if (!canShow) return;
        void loadRecommendations(false);
    }, [canShow, loadRecommendations]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width;
            setVisibleCount(visibleCountForWidth(width));
        });
        observer.observe(el);
        setVisibleCount(visibleCountForWidth(el.getBoundingClientRect().width));

        return () => observer.disconnect();
    }, [canShow, loading, error, recommendations.length, fetchDone]);

    const itemCount = recommendations.length;

    const visibleRecommendations = useMemo(
        () => circularSlice(recommendations, startIndex, visibleCount),
        [recommendations, startIndex, visibleCount],
    );

    const goPrev = useCallback(() => {
        if (itemCount === 0) return;
        setStartIndex((prev) => (prev - visibleCount + itemCount) % itemCount);
    }, [itemCount, visibleCount]);

    const goNext = useCallback(() => {
        if (itemCount === 0) return;
        setStartIndex((prev) => (prev + visibleCount) % itemCount);
    }, [itemCount, visibleCount]);

    const pageCount = useMemo(
        () => pageCountFor(itemCount, visibleCount),
        [itemCount, visibleCount],
    );

    const currentPage = useMemo(
        () => currentPageIndex(startIndex, visibleCount, pageCount),
        [startIndex, visibleCount, pageCount],
    );

    const goToPage = useCallback(
        (page: number) => {
            if (itemCount === 0) return;
            setStartIndex((page * visibleCount) % itemCount);
        },
        [itemCount, visibleCount],
    );

    const handleReload = useCallback(() => {
        const excludeCourseIds = recommendations.map((rec) => rec.course.id);
        void loadRecommendations(true, excludeCourseIds);
    }, [loadRecommendations, recommendations]);

    const reloadButton = renderReloadButton(t, handleReload, refreshing);

    if (!canShow) return null;
    if (loading) return renderLoadingState(resolvedTitle, className, t);
    if (error) return renderErrorState(resolvedTitle, className, error, reloadButton);
    if (fetchDone && itemCount === 0) {
        return renderEmptyState(resolvedTitle, className, t, openOnboarding, reloadButton);
    }

    return renderRecommendationsCarousel({
        title: resolvedTitle,
        className,
        containerRef,
        visibleRecommendations,
        startIndex,
        visibleCount,
        itemCount,
        pageCount,
        currentPage,
        onPrev: goPrev,
        onNext: goNext,
        onGoToPage: goToPage,
        headerAction: reloadButton,
        t,
    });
}
