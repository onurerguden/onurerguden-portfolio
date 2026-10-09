/**
 * The desk's QA counters (frames drawn, camera, draw calls, the objects'
 * motion) are canvas attributes written on every frame. Visitors never read
 * them, so only tests and capture scripts get them: "portfolio:qa" set to
 * "1" in localStorage (Playwright's storage state does this), or `?qa` in
 * the address.
 */
export const qaKey = "portfolio:qa";

export function qaRequested(stored: string | null, search: string) {
  return stored === "1" || new URLSearchParams(search).has("qa");
}

let decided: boolean | null = null;

/** Whether this visit writes QA attributes; read once. */
export function qa(): boolean {
  if (decided !== null) return decided;
  if (typeof window === "undefined") return false;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(qaKey);
  } catch {
    // Storage can be blocked; the address can still ask.
  }
  return (decided = qaRequested(stored, location.search));
}
