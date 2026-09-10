import { useTranslation } from "react-i18next";
import { SkeletonBar } from "../../../shared/components/SkeletonBar";

const PANEL =
    "rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800";

function StatCardSkeleton() {
    return (
        <div className={`${PANEL} p-4`}>
            <div className="flex items-center gap-3">
                <SkeletonBar className="h-10 w-10 rounded-lg" />
                <div className="min-w-0 flex-1">
                    <SkeletonBar className="h-3 w-24" />
                    <SkeletonBar className="mt-2 h-5 w-16" />
                </div>
            </div>
        </div>
    );
}

/** Header of a panel: title plus its smaller subtitle. */
function PanelHeaderSkeleton({ inset = false }: { inset?: boolean }) {
    return (
        <div
            className={
                inset
                    ? "border-b border-gray-200 px-4 py-3 dark:border-slate-600"
                    : ""
            }
        >
            <SkeletonBar className="h-4 w-40" />
            <SkeletonBar className="mt-2 h-3 w-56" />
        </div>
    );
}

/** Bars of decreasing height, so the block reads as a chart and not as a table. */
function ChartSkeleton({ heights }: { heights: string[] }) {
    return (
        <div className="flex h-[200px] items-end gap-2" aria-hidden>
            {heights.map((height, index) => (
                <SkeletonBar key={index} className={`flex-1 ${height}`} />
            ))}
        </div>
    );
}

function RankedListSkeleton() {
    return (
        <ol className="divide-y divide-gray-100 dark:divide-slate-700">
            {[0, 1, 2, 3, 4].map((row) => (
                <li key={row} className="flex items-center justify-between gap-3 px-4 py-2">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                        <SkeletonBar className="h-5 w-5 rounded-full" />
                        <SkeletonBar className="h-3 flex-1" />
                    </span>
                    <SkeletonBar className="h-3 w-16" />
                </li>
            ))}
        </ol>
    );
}

/**
 * Placeholder for the public statistics while they load.
 *
 * It mirrors the real layout -- four stat cards, then two rows of two panels --
 * so the page does not jump when the data arrives, which is the whole point of
 * a skeleton over a "loading…" line. The live region keeps the announcement the
 * text used to make, since every block inside is `aria-hidden`.
 */
export function LandingSkeleton() {
    const { t } = useTranslation();

    return (
        <div role="status" aria-live="polite">
            <span className="sr-only">{t("landing.loadingStats")}</span>

            <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((card) => (
                    <StatCardSkeleton key={card} />
                ))}
            </section>

            <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className={PANEL}>
                    <PanelHeaderSkeleton inset />
                    <RankedListSkeleton />
                </div>
                <div className={`${PANEL} p-4`}>
                    <PanelHeaderSkeleton />
                    <div className="mt-4">
                        <ChartSkeleton
                            heights={["h-4/5", "h-3/5", "h-1/2", "h-2/5", "h-1/3", "h-1/4"]}
                        />
                    </div>
                </div>
            </section>

            <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className={`${PANEL} p-4`}>
                    <PanelHeaderSkeleton />
                    <div className="mt-4">
                        <ChartSkeleton
                            heights={[
                                "h-1/2",
                                "h-3/5",
                                "h-2/5",
                                "h-4/5",
                                "h-1/3",
                                "h-3/5",
                                "h-1/2",
                            ]}
                        />
                    </div>
                    <div className="mt-1 flex justify-between">
                        <SkeletonBar className="h-2 w-12" />
                        <SkeletonBar className="h-2 w-12" />
                    </div>
                </div>
                <div className={`${PANEL} p-4`}>
                    <PanelHeaderSkeleton />
                    <div className="mt-4">
                        <ChartSkeleton heights={["h-4/5", "h-3/5", "h-2/5", "h-1/4"]} />
                    </div>
                </div>
            </section>
        </div>
    );
}
