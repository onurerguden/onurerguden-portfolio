type Scheduler = { yield?: () => Promise<void> };

/**
 * Gives the browser a turn (input, scrolling, painting) before long work
 * continues. `scheduler.yield` keeps this task's priority; elsewhere a
 * message-channel turn is the next best thing (a timeout would wait at least
 * 4 ms once nested).
 */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: Scheduler }).scheduler;
  if (typeof scheduler?.yield === "function") return scheduler.yield();
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}
