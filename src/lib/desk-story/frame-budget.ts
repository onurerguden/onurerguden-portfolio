/**
 * Watches how long the desk takes per drawn frame while it is moving. The
 * scene renders on demand, so only frames that follow one another closely
 * (a scroll or an object animation) count; a pause between them is idle time,
 * not a slow frame.
 */
export type FrameBudget = {
  /** Records a drawn frame; true once the desk is judged too slow. */
  record(now: number): boolean;
};

export function createFrameBudget({
  samples = 45,
  slowMs = 20,
  gapMs = 120,
}: { samples?: number; slowMs?: number; gapMs?: number } = {}): FrameBudget {
  const intervals: number[] = [];
  let last = -Infinity;
  let decided = false;
  return {
    record(now) {
      if (decided) return false;
      const interval = now - last;
      last = now;
      if (interval > gapMs) return false;
      intervals.push(interval);
      if (intervals.length < samples) return false;
      const sorted = [...intervals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      intervals.length = 0;
      if (median <= slowMs) return false;
      decided = true;
      return true;
    },
  };
}
