import { useCallback } from "react";

/**
 * Hook to provide scroll containment for dropdown menus.
 * When the cursor is over a scrollable dropdown, scroll wheel events
 * are contained within the dropdown instead of scrolling the page.
 */
export function useScrollContainment() {
  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;

    // Check if element is scrollable
    const isScrollable = scrollHeight > clientHeight;
    if (!isScrollable) return;

    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1; // -1 for rounding tolerance

    const scrollingUp = event.deltaY < 0;
    const scrollingDown = event.deltaY > 0;

    // If we can still scroll inside the dropdown, prevent page scroll
    if ((scrollingUp && !atTop) || (scrollingDown && !atBottom)) {
      event.stopPropagation();
    }
  }, []);

  return { handleWheel };
}

/**
 * Standalone wheel handler for use in components without hooks
 */
export const handleDropdownWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
  const target = event.currentTarget;
  const { scrollTop, scrollHeight, clientHeight } = target;

  // Check if element is scrollable
  const isScrollable = scrollHeight > clientHeight;
  if (!isScrollable) return;

  const atTop = scrollTop <= 0;
  const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

  const scrollingUp = event.deltaY < 0;
  const scrollingDown = event.deltaY > 0;

  if ((scrollingUp && !atTop) || (scrollingDown && !atBottom)) {
    event.stopPropagation();
  }
};
