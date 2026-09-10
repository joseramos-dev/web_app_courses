/**
 * One shimmering placeholder block.
 *
 * The animation itself lives in `index.css` as `.skeleton-shimmer`, which
 * already carries its dark-theme gradient. This wrapper only adds the shape and
 * the `aria-hidden`: a screen reader gains nothing from a wall of empty boxes,
 * and the surrounding region announces the loading state instead.
 */
export function SkeletonBar({ className = "" }: { className?: string }) {
    return <div aria-hidden className={`skeleton-shimmer rounded ${className}`} />;
}
