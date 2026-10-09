/** A task of its own: after rendering, input and anything else queued. */
function nextTask(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

/**
 * Gives the browser a whole frame before long work continues: waits for the
 * next animation frame, then for a task queued from it, so the work resumes
 * after that frame has been painted. `scheduler.yield` was cheaper but keeps
 * its task's priority, so its continuations ran before the browser rendered
 * and several steps added up to one long frame. A hidden page draws no
 * frames; there a plain task keeps the work going.
 */
export function yieldToFrame(): Promise<void> {
  if (
    typeof requestAnimationFrame !== "function" ||
    typeof document === "undefined" ||
    document.visibilityState === "hidden"
  )
    return nextTask();
  return new Promise((resolve) =>
    requestAnimationFrame(() => void nextTask().then(resolve)),
  );
}

/** The longest stretch of work between two frames, in milliseconds. */
export const sliceBudget = 6;

/**
 * Splits a loop into slices of at most `budget` milliseconds of work, one
 * per frame. Await the returned function before each step: it returns at
 * once while the current slice has time left and yields a frame otherwise,
 * so short work keeps its pace and long work never holds a frame.
 */
export function frameSlices(
  budget = sliceBudget,
  now: () => number = () => performance.now(),
) {
  let start = now();
  return async function slice() {
    if (now() - start < budget) return;
    await yieldToFrame();
    start = now();
  };
}
