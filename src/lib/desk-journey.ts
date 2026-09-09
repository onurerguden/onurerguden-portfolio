/** Scroll distances in stable viewport heights; never elapsed animation time. */
export const journeyLength = 7.5;
export const readingRanges = [
  [1.25, 3.25],
  [4, 5.25],
  [6, 7],
] as const;
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
export function journeyAt(distance: number) {
  const d = Math.max(0, Math.min(journeyLength, distance));
  let from = 0,
    to = 0,
    travel = 0;
  if (d >= 0.5 && d < 1.25) {
    to = 1;
    travel = (d - 0.5) / 0.75;
  } else if (d >= 1.25 && d < 3.25) {
    from = to = 1;
  } else if (d >= 3.25 && d < 4) {
    from = 1;
    to = 2;
    travel = (d - 3.25) / 0.75;
  } else if (d >= 4 && d < 5.25) {
    from = to = 2;
  } else if (d >= 5.25 && d < 6) {
    from = 2;
    to = 3;
    travel = (d - 5.25) / 0.75;
  } else if (d >= 6) {
    from = to = 3;
  }
  return {
    distance: d,
    from,
    to,
    travel: ease(travel),
    reading: readingRanges.map(([start, end]) =>
      clamp((d - start) / (end - start)),
    ),
    preview: Math.sin(clamp(d / 0.5) * Math.PI) * 18,
    exit: ease((d - 7) / 0.5),
    active: from === to && from > 0 && d <= 7 ? from - 1 : -1,
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
  const [start, end] = readingRanges[screen];
  return start + (end - start) * ((card * 2 + 0.5) / (count * 2 - 1));
}
export type JourneyCard = {
  title: string;
  body: string;
  href: string;
  action: string;
  image?: string;
};
export type JourneyContent = {
  name: string;
  intro: string;
  cv: string;
  cvLabel: string;
  labels: string[];
  screens: JourneyCard[][];
};
