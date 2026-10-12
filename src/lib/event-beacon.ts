import type { EventLocation, SiteEvent } from "./events";
import { homeSectionIds } from "./home-sections";
import { optedOut } from "./privacy";
import { entryEventChannel } from "./event-entry";

/**
 * Counts the site's conversion events (src/lib/events.ts) with one anonymous
 * beacon each. Nothing is sent when the visitor asks not to be tracked
 * (Global Privacy Control or Do Not Track), and nothing identifies them.
 */
export function track(event: SiteEvent) {
  if (optedOut()) return;
  // A plain-text body needs no preflight and survives the page unloading.
  navigator.sendBeacon?.(
    "/api/event",
    JSON.stringify({ ...event, channel: entryEventChannel() }),
  );
}

const casePath = /^\/(?:en|tr)\/projects\/([^/]+)\/?$/;

/** Where on the site a link was used. */
export function locationOf(element: Element): EventLocation {
  if (element.closest("footer")) return "footer";
  if (element.closest("[data-xp]")) return "desk";
  const section = element.closest(homeSectionIds.map((id) => `#${id}`).join());
  if (section) return section.id as EventLocation;
  const path = window.location.pathname;
  if (casePath.test(path)) return "case";
  if (/^\/(?:en|tr)\/research\/?$/.test(path)) return "research";
  if (/^\/(?:en|tr)\/projects\/?$/.test(path)) return "archive";
  return "page";
}

/** The case study a link belongs to: its page, or its card on the home page. */
function projectOf(element: Element) {
  const card = element.closest("[aria-labelledby^='project-']");
  if (card)
    return card.getAttribute("aria-labelledby")!.slice("project-".length);
  return casePath.exec(window.location.pathname)?.[1];
}

/** The event a click on this link stands for, if any. */
export function eventFor(link: HTMLAnchorElement): SiteEvent | null {
  const href = link.getAttribute("href") ?? "";
  if (href.startsWith("mailto:"))
    return {
      name: /subject=CV/i.test(href) ? "cv_request" : "email_click",
      location: locationOf(link),
    };
  if (link.hreflang === "en" || link.hreflang === "tr")
    return { name: "language_switch", to: link.hreflang };
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com"))
    return { name: "linkedin_click", location: locationOf(link) };
  if (url.hostname !== "github.com") return null;
  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (owner?.toLowerCase() !== "onurerguden") return null;
  const project = repo ? projectOf(link) : undefined;
  return project
    ? { name: "source_click", project }
    : { name: "github_click", location: locationOf(link) };
}

/** Counts a click on a counted link, if the target is in one. */
export function countClick(target: EventTarget | null) {
  const link = (target as Element | null)?.closest?.("a[href]");
  const counted = link && eventFor(link as HTMLAnchorElement);
  if (counted) track(counted);
}

/**
 * Listens for the counted clicks and, on a case study, for the reader
 * reaching its last paragraph. Returns the clean-up.
 */
export function listen() {
  const click = (event: MouseEvent) => countClick(event.target);
  document.addEventListener("click", click, { capture: true });
  let observer: IntersectionObserver | undefined;
  const project = casePath.exec(window.location.pathname)?.[1];
  const end = document.querySelector("main article > :last-child");
  if (project && end) {
    observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer?.disconnect();
      track({ name: "case_study_read", project });
    });
    observer.observe(end);
  }
  return () => {
    document.removeEventListener("click", click, { capture: true });
    observer?.disconnect();
  };
}
