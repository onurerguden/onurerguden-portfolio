/**
 * One scroll listener for the page's scroll-driven code. Each subscriber
 * reads the layout it needs and returns what to write; every read runs
 * before any write in the same event. Two listeners that each read and then
 * wrote made the second read force a layout the first had just dirtied
 * (about 100 ms over 800 scroll events on the desk).
 *
 * Reads are `getBoundingClientRect`, `offsetHeight`, `scrollY` and the like;
 * writes are DOM attributes, styles, signals and React state. A subscriber
 * that reads attributes another one writes keeps doing so in its write, so
 * it sees them in the same order as before.
 */
export type ScrollRead = () => (() => void) | void;

type Target = Pick<EventTarget, "addEventListener" | "removeEventListener">;

export function createScrollFrame(target: () => Target | undefined) {
  const readers = new Set<ScrollRead>();
  let bound: Target | undefined;
  const dispatch = () => {
    const writes: (() => void)[] = [];
    for (const read of readers) {
      const write = read();
      if (write) writes.push(write);
    }
    for (const write of writes) write();
  };
  return {
    /** Runs `read` on every scroll, then the write it returns; unsubscribes. */
    subscribe(read: ScrollRead) {
      readers.add(read);
      if (!bound) {
        bound = target();
        bound?.addEventListener("scroll", dispatch, { passive: true });
      }
      return () => {
        readers.delete(read);
        if (readers.size || !bound) return;
        bound.removeEventListener("scroll", dispatch);
        bound = undefined;
      };
    },
  };
}

const frame = createScrollFrame(() =>
  typeof window === "undefined" ? undefined : window,
);

/** Subscribes to the window's scroll; see `createScrollFrame`. */
export const onScrollFrame = frame.subscribe;
