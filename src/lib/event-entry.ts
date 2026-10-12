"use client";
import { classifyEventChannel } from "./event-channels";
import { optedOut } from "./privacy";

/**
 * Imported eagerly by SiteEvents, before the deferred beacon module.
 * Only an enum survives in this document's memory. A client navigation
 * reuses it; a new document classifies its own referrer and current URL.
 * The server never reads browser data or holds mutable request state.
 */
const channel =
  typeof window === "undefined" || optedOut()
    ? undefined
    : classifyEventChannel({
        url: window.location.href,
        referrer: document.referrer,
      });

export const entryEventChannel = () => channel;
