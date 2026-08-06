// Verifica el hook que alimenta los botones "Mostrar más" de los
// dashboards: colapsa la lista a `initialCount` elementos, permite
// expandirla/colapsarla con `toggle`, y no ofrece expandir si ya se ven
// todos los elementos.
//
//   cd frontend
//   npm test -- useExpandableList
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useExpandableList } from "./useExpandableList";

describe("useExpandableList", () => {
    it("muestra solo initialCount elementos cuando hay más de los que caben", () => {
        const items = [1, 2, 3, 4, 5, 6];
        const { result } = renderHook(() => useExpandableList(items, 4));

        expect(result.current.visibleItems).toEqual([1, 2, 3, 4]);
        expect(result.current.canExpand).toBe(true);
        expect(result.current.hiddenCount).toBe(2);
        expect(result.current.isExpanded).toBe(false);
    });

    it("no permite expandir si ya hay pocos elementos como para colapsar", () => {
        const items = [1, 2];
        const { result } = renderHook(() => useExpandableList(items, 4));

        expect(result.current.visibleItems).toEqual([1, 2]);
        expect(result.current.canExpand).toBe(false);
        expect(result.current.hiddenCount).toBe(0);
    });

    it("toggle() expande y vuelve a colapsar la lista completa", () => {
        const items = [1, 2, 3, 4, 5, 6];
        const { result } = renderHook(() => useExpandableList(items, 4));

        act(() => result.current.toggle());
        expect(result.current.isExpanded).toBe(true);
        expect(result.current.visibleItems).toEqual(items);

        act(() => result.current.toggle());
        expect(result.current.isExpanded).toBe(false);
        expect(result.current.visibleItems).toEqual([1, 2, 3, 4]);
    });

    it("expand() y collapse() fijan el estado directamente", () => {
        const items = [1, 2, 3, 4, 5];
        const { result } = renderHook(() => useExpandableList(items, 3));

        act(() => result.current.expand());
        expect(result.current.isExpanded).toBe(true);

        act(() => result.current.collapse());
        expect(result.current.isExpanded).toBe(false);
        expect(result.current.visibleItems).toEqual([1, 2, 3]);
    });
});
