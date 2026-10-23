/**
 * Runs `callback` once the browser is idle (at the latest after `timeout`
 * milliseconds), or after `fallback` milliseconds where idle callbacks are
 * missing. Returns the cancel for whichever was scheduled: idle callbacks and
 * timers are numbered apart, so clearing one kind with the other's cancel
 * could stop an unrelated timer that shares the number.
 */
export function whenIdle(
  callback: () => void,
  { timeout, fallback }: { timeout: number; fallback: number },
): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => callback(), { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, fallback);
  return () => clearTimeout(id);
}
