/** Distances are native scroll in stable viewport heights, never elapsed time. */
export const journeyLength = 7.85;
export type CameraStop =
  "opening" | "desktop" | "portrait" | "macbook" | "room";
export const screenIds = [
  "PortraitScreen",
  "UltrawideScreen",
  "MacBookScreen",
] as const;
export const screenConfiguration = {
  PortraitScreen: { stop: "portrait", reading: [2, 4] },
  UltrawideScreen: { stop: "opening", reading: null },
  MacBookScreen: { stop: "macbook", reading: [5, 6] },
} as const;
export const screenStops = screenIds.map((id) => screenConfiguration[id].stop);
export const readingRanges: readonly (readonly [number, number] | null)[] =
  screenIds.map((id) => screenConfiguration[id].reading);
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const transitions: readonly [number, number, CameraStop, CameraStop][] = [
  [0.15, 1.15, "opening", "desktop"],
  [1.25, 2, "desktop", "portrait"],
  [4, 5, "portrait", "macbook"],
  [6, 7.5, "macbook", "room"],
];
export function journeyAt(distance: number) {
  const d = Math.max(0, Math.min(journeyLength, distance));
  let from: CameraStop = "opening",
    to: CameraStop = "opening",
    travel = 0;
  for (const [start, end, a, b] of transitions) {
    if (d < start) break;
    if (d < end) {
      from = a;
      to = b;
      travel = ease((d - start) / (end - start));
      break;
    }
    from = to = b;
  }
  return {
    distance: d,
    from,
    to,
    travel,
    reading: readingRanges.map((range) =>
      range ? clamp((d - range[0]) / (range[1] - range[0])) : 0,
    ),
    preview: 0,
    exit: 0,
    active:
      from === to
        ? screenIds.findIndex(
            (id) =>
              screenConfiguration[id].stop === from &&
              screenConfiguration[id].reading !== null,
          )
        : -1,
  };
}
/** Hold each page still before moving to the next page. */
export function pageOffset(progress: number, count: number) {
  const steps = count * 2 - 1;
  const value = clamp(progress) * steps;
  const segment = Math.min(steps - 1, Math.floor(value));
  return Math.min(
    count - 1,
    Math.floor(segment / 2) + (segment % 2 ? ease(value - segment) : 0),
  );
}
export function focusDistance(screen: number, card: number, count: number) {
  const range = readingRanges[screen];
  if (!range) return journeyLength;
  const [start, end] = range;
  return start + (end - start) * ((card * 2 + 0.5) / (count * 2 - 1));
}
export type JourneyCard = {
  title: string;
  body: string;
  href: string;
  action: string;
  visual?: string;
};
export type JourneyContent = {
  name: string;
  role: string;
  intro: string;
  cv: string;
  cvLabel: string;
  labels: string[];
  screens: JourneyCard[][];
};
