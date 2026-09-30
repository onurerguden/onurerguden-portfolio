/**
 * Decides which WebGL stages may hold a live context at once.
 *
 * Every section scene (and the desk journey) is a separate canvas. Browsers,
 * and iOS Safari in particular, keep each context's GPU memory until the
 * canvas is removed, so the page never runs more than `liveContextLimit`.
 */
export const liveContextLimit = 2;

export type StageRequest = {
  id: string;
  /** Higher priority wins between stages that are equally visible. */
  priority: number;
  /** Overlaps the viewport. A visible stage always outranks an offscreen one. */
  visible: boolean;
  /** Within the preload margin, so the stage would like a context. */
  wanted: boolean;
  /** Registration order; the final tie-breaker. */
  order: number;
};

/** Ranks the stages that want a context and keeps the best `limit`. */
export function allocateStages(
  requests: readonly StageRequest[],
  live: ReadonlySet<string>,
  limit = liveContextLimit,
): Set<string> {
  const ranked = requests
    .filter((request) => request.wanted || request.visible)
    .sort(
      (a, b) =>
        Number(b.visible) - Number(a.visible) ||
        b.priority - a.priority ||
        // Keep an already-live stage rather than churn two equal ones.
        Number(live.has(b.id)) - Number(live.has(a.id)) ||
        a.order - b.order,
    );
  return new Set(ranked.slice(0, limit).map((request) => request.id));
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

export type StageRegistry = ReturnType<typeof createStageRegistry>;

export function createStageRegistry(limit = liveContextLimit) {
  const requests = new Map<string, StageRequest>();
  const listeners = new Set<() => void>();
  let live: ReadonlySet<string> = new Set();
  let order = 0;
  const recompute = () => {
    const next = allocateStages([...requests.values()], live, limit);
    if (sameSet(next, live)) return;
    live = next;
    for (const listener of listeners) listener();
  };
  return {
    update(
      id: string,
      state: Pick<StageRequest, "priority" | "visible" | "wanted">,
    ) {
      const previous = requests.get(id);
      if (
        previous &&
        previous.priority === state.priority &&
        previous.visible === state.visible &&
        previous.wanted === state.wanted
      )
        return;
      requests.set(id, { ...state, id, order: previous?.order ?? order++ });
      recompute();
    },
    remove(id: string) {
      if (requests.delete(id)) recompute();
    },
    isLive: (id: string) => live.has(id),
    liveIds: () => live,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** The page-wide registry shared by the journey and every section stage. */
export const stageRegistry = createStageRegistry();
