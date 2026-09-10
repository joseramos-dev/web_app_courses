import { SkeletonBar } from "../../../shared/components/SkeletonBar";

export function CourseCardSkeleton() {
    return (
        <article
            aria-hidden
            className="flex h-full animate-pulse flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800"
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <SkeletonBar className="h-3 w-20" />
                <SkeletonBar className="h-4 w-14 rounded-full" />
            </div>

            <SkeletonBar className="mb-2 h-5 w-full" />
            <SkeletonBar className="mb-2 h-5 w-4/5" />

            <SkeletonBar className="mb-1 h-3 w-full" />
            <SkeletonBar className="mb-1 h-3 w-full" />
            <SkeletonBar className="mb-3 h-3 w-2/3" />

            <div className="flex-1" />

            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-slate-600">
                <SkeletonBar className="h-3 w-full" />
                <SkeletonBar className="h-3 w-full" />
                <SkeletonBar className="h-3 w-full" />
            </div>

            <div className="mt-2 flex items-center justify-between">
                <SkeletonBar className="h-3 w-16" />
                <SkeletonBar className="h-3 w-14" />
            </div>
        </article>
    );
}
