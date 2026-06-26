import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CourseCard } from "../../features/courses/components/CourseCard";
import { get_recommended } from "../../features/courses/api";
import type { ICourseRecommendation } from "../interfaces/IRecommendation";
import { useAuth } from "../povider/AuthContext";

/** Fixed carousel track height (badge row + card slot). */
const CAROUSEL_ROW_HEIGHT = "h-[26rem]";
const CAROUSEL_CARD_SLOT_HEIGHT = "h-[22rem]";

const NAV_BUTTON_CLASS =
    "flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

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

function circularSlice<T>(items: T[], startIndex: number, count: number): T[] {
    if (items.length === 0) return [];
    const take = Math.min(count, items.length);
    return Array.from({ length: take }, (_, i) => items[(startIndex + i) % items.length]);
}

type SectionShellProps = {
    title: string;
    className?: string;
    ariaLabel?: string;
    children: ReactNode;
};

function CarouselSectionShell({ title, className = "", ariaLabel, children }: SectionShellProps) {
    return (
        <section className={className} aria-label={ariaLabel ?? title}>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
                {title}
            </h2>
            {children}
        </section>
    );
}

function renderLoadingState(title: string, className: string) {
    return (
        <CarouselSectionShell title={title} className={className}>
            <p className="text-sm text-gray-500 dark:text-slate-400">
                Cargando recomendaciones…
            </p>
        </CarouselSectionShell>
    );
}

function renderErrorState(title: string, className: string, error: string) {
    return (
        <CarouselSectionShell title={title} className={className}>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </CarouselSectionShell>
    );
}

function renderEmptyState(title: string, className: string) {
    return (
        <CarouselSectionShell title={title} className={className}>
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-slate-600 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    No hay suficientes datos para realizar una recomendación.
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                    Introduce tus preferencias de cursos (categorías, idiomas, plataformas,
                    etc.) para que podamos sugerirte contenido adaptado a ti.
                </p>
                <Link
                    to="/settings#recommendation-preferences"
                    className="mt-5 inline-flex items-center rounded-lg bg-uned-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-uned-primary-hover"
                >
                    Configurar preferencias
                </Link>
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
    onPrev: () => void;
    onNext: () => void;
};

function renderRecommendationsCarousel({
    title,
    className,
    containerRef,
    visibleRecommendations,
    startIndex,
    visibleCount,
    itemCount,
    onPrev,
    onNext,
}: CarouselTrackProps) {
    const cardBasis = cardBasisForVisibleCount(visibleCount);

    return (
        <CarouselSectionShell title={title} className={className}>
            <div className={`flex items-center gap-2 sm:gap-3 ${CAROUSEL_ROW_HEIGHT}`}>
                <button
                    type="button"
                    onClick={onPrev}
                    disabled={itemCount === 0}
                    aria-label="Ver recomendaciones anteriores"
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
                            <div className="mb-2 flex h-7 shrink-0 items-center justify-end">
                                <span className="rounded-full bg-uned-primary/10 px-2.5 py-0.5 text-xs font-semibold text-uned-primary dark:bg-uned-primary/20">
                                    {rec.recommendation_percent}% coincidencia
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
                    aria-label="Ver siguientes recomendaciones"
                    className={NAV_BUTTON_CLASS}
                >
                    <ChevronRight className="size-5" />
                </button>
            </div>
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
    title = "Recomendados para ti",
    className = "",
    hideForAdmin = false,
}: RecommendedCoursesCarouselProps) {
    const { user, isLoading: isAuthLoading } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const [recommendations, setRecommendations] = useState<ICourseRecommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startIndex, setStartIndex] = useState(0);
    const [visibleCount, setVisibleCount] = useState(4);
    const [fetchDone, setFetchDone] = useState(false);

    const canShow =
        !isAuthLoading &&
        user != null &&
        (user.role === "student" || (user.role === "admin" && !hideForAdmin));

    useEffect(() => {
        if (!canShow) return;

        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                setFetchDone(false);
                const res = await get_recommended(fetchLimit);
                if (!cancelled) {
                    setRecommendations(res.recommendations);
                    setStartIndex(0);
                    setFetchDone(true);
                }
            } catch (e) {
                console.error("Error fetching recommended courses:", e);
                if (!cancelled) {
                    setError("No se pudieron cargar las recomendaciones.");
                    setFetchDone(true);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [canShow, fetchLimit]);

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

    if (!canShow) return null;
    if (loading) return renderLoadingState(title, className);
    if (error) return renderErrorState(title, className, error);
    if (fetchDone && itemCount === 0) return renderEmptyState(title, className);

    return renderRecommendationsCarousel({
        title,
        className,
        containerRef,
        visibleRecommendations,
        startIndex,
        visibleCount,
        itemCount,
        onPrev: goPrev,
        onNext: goNext,
    });
}
