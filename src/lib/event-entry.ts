"use client";
import { classifyEventChannel } from "./event-channels";
import { optedOut } from "./privacy";

/**
 * Imported eagerly by SiteEvents, before the deferred beacon module.
 * Only an enum survives in this document's memory. A client navigation
 * reuses it; a new document classifies its own referrer and navigation URL.
 * The server never reads browser data or holds mutable request state.
 */
const channel =
  typeof window === "undefined" || optedOut()
    ? undefined
    : classifyEventChannel({
        // Navigation Timing retains the initial document URL even if history
        // changes before this chunk executes. Only the coarse enum survives.
        url:
          window.performance?.getEntriesByType?.("navigation")[0]?.name ||
          window.location.href,
        referrer: document.referrer,
      });

export const entryEventChannel = () => channel;
