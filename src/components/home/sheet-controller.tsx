"use client";
import { useEffect } from "react";

/**
 * Keeps keyboard focus visible on the stacked section sheets (WCAG 2.4.11).
 * A later sheet slides over the one before it, so a focused element can sit
 * under it; then the page scrolls back to where its sheet is uncovered.
 */
export default function SheetController() {
  useEffect(() => {
    const reveal = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const sheet = target.closest<HTMLElement>("[data-sheet]");
      // The sheet itself takes focus when a link lands on it (/en#research);
      // the landing owns that scroll, and the sheet's top is what it shows.
      if (
        !sheet ||
        target === sheet ||
        getComputedStyle(sheet).getPropertyValue("--sheets") !== "on"
      )
        return;
      const rect = target.getBoundingClientRect();
      const topmost = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      if (topmost && sheet.contains(topmost)) return;
      // The sheet's section rests bottom-aligned with nothing over it when
      // the wrapper's top is this far above the view.
      const section = sheet.querySelector<HTMLElement>(":scope > section");
      const overflow = Math.max(0, (section?.offsetHeight ?? 0) - innerHeight);
      window.scrollTo({
        top: sheet.getBoundingClientRect().top + window.scrollY + overflow,
        behavior: "instant",
      });
      target.scrollIntoView({ block: "nearest", behavior: "instant" });
    };
    document.addEventListener("focusin", reveal);
    return () => document.removeEventListener("focusin", reveal);
  }, []);
  return null;
}
