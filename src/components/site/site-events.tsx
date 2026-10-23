"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { optedOut } from "@/lib/privacy";
// Capture entry before the first interaction imports the conversion counter.
import "@/lib/event-entry";

const firstUse = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

/**
 * Anonymous page views with Vercel Web Analytics on production: no cookies,
 * and its script comes from this origin (/_vercel/insights), so the CSP
 * stays 'self'. And the conversion counter (src/lib/event-beacon.ts), loaded
 * on the visitor's first interaction, so a page that is only looked at loads
 * nothing for it; a click that lands before it does is kept and counted once
 * it arrives. Both load apart from the first-load bundle.
 */
export default function SiteEvents({ pageViews }: { pageViews: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!pageViews) return;
    import("@vercel/analytics").then(
      ({ inject }) =>
        inject({
          framework: "next",
          beforeSend: (event) => (optedOut() ? null : event),
        }),
      // A chunk that cannot load (an old tab after a deploy) counts nothing.
      () => {},
    );
  }, [pageViews]);
  useEffect(() => {
    let live = true;
    let stop = () => {};
    const early: EventTarget[] = [];
    const remember = (event: Event) => early.push(event.target!);
    // Stops collecting early clicks: the counter took them, or its chunk
    // could not load (an old tab after a deploy) and nothing is counted.
    const forget = () =>
      document.removeEventListener("click", remember, { capture: true });
    const off = () => {
      for (const type of firstUse)
        window.removeEventListener(type, load, { capture: true });
    };
    function load() {
      off();
      import("@/lib/event-beacon").then(({ countClick, listen }) => {
        forget();
        if (!live) return;
        stop = listen();
        for (const target of early.splice(0)) countClick(target);
      }, forget);
    }
    document.addEventListener("click", remember, { capture: true });
    for (const type of firstUse)
      window.addEventListener(type, load, { capture: true, passive: true });
    return () => {
      live = false;
      off();
      forget();
      stop();
    };
    // Layouts survive client navigation. Rebind the case-read observer to
    // the new article, while the entry channel stays in document memory.
  }, [pathname]);
  return null;
}
