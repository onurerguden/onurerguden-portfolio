/**
 * A value that changes every scroll frame without re-rendering React: the
 * journey writes the story distance here and the scene reads it in its frame
 * loop. Listeners run only when the value actually changes.
 */
export type Signal<T> = {
  get(): T;
  set(next: T): void;
  on(listener: (value: T) => void): () => void;
};

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const listeners = new Set<(value: T) => void>();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) listener(value);
    },
    on(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
