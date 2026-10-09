const inputs = ["wheel", "touchstart", "touchmove", "scroll"] as const;

/**
 * Resolves once the visitor has not scrolled (wheel, touch or the page's
 * own scroll) for `quiet` ms, or after `max` ms whatever they do. Heavy
 * work that can wait (setting up the desk) waits for it, so it never lands
 * on the frames of a scroll under way. An aborted wait never resolves.
 */
export function afterScrollPause(
  quiet: number,
  max: number,
  signal?: AbortSignal,
  target: Pick<
    EventTarget,
    "addEventListener" | "removeEventListener"
  > = window,
): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return;
    let timer = setTimeout(done, quiet);
    const limit = setTimeout(done, max);
    function restart() {
      clearTimeout(timer);
      timer = setTimeout(done, quiet);
    }
    function stop() {
      clearTimeout(timer);
      clearTimeout(limit);
      for (const input of inputs) target.removeEventListener(input, restart);
      signal?.removeEventListener("abort", stop);
    }
    function done() {
      stop();
      resolve();
    }
    for (const input of inputs)
      target.addEventListener(input, restart, { passive: true });
    signal?.addEventListener("abort", stop);
  });
}
