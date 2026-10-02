/**
 * The home section the visitor is reading, or null at the opening. The journey
 * and the sections after it report into it; the language link reads it so a
 * switch lands on the same section in the other language. It never touches
 * the URL or history.
 */
let current: string | null = null;
const listeners = new Set<() => void>();

export const currentSection = {
  get: () => current,
  set(id: string | null) {
    if (id === current) return;
    current = id;
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
