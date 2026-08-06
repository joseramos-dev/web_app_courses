import { useMemo, useState } from "react";

export function useExpandableList<T>(items: T[], initialCount = 4) {
    const [isExpanded, setIsExpanded] = useState(false);

    const canExpand = items.length > initialCount;
    const hiddenCount = canExpand ? items.length - initialCount : 0;

    const visibleItems = useMemo(
        () => (isExpanded || !canExpand ? items : items.slice(0, initialCount)),
        [items, isExpanded, canExpand, initialCount],
    );

    return {
        visibleItems,
        isExpanded,
        canExpand,
        hiddenCount,
        toggle: () => setIsExpanded((prev) => !prev),
        expand: () => setIsExpanded(true),
        collapse: () => setIsExpanded(false),
    };
}
