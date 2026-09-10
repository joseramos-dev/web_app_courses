import { useEffect, useRef, type RefObject } from "react";

/**
 * Runs `onOutsideClick` when a mousedown event lands outside the element
 * referenced by `ref`. Used to close a dropdown/panel when the user clicks
 * elsewhere on the page.
 *
 * Pass `enabled = false` to skip attaching the listener (e.g. while the
 * panel is already closed); defaults to `true`, so the listener is always
 * attached unless the caller opts out.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutsideClick: () => void,
  enabled: boolean = true,
): void {
  const onOutsideClickRef = useRef(onOutsideClick);
  onOutsideClickRef.current = onOutsideClick;

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClickRef.current();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, enabled]);
}
