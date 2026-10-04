import { signal } from "./signal";

/**
 * The paper curtain runs where the section sheets do (site.css): wide enough
 * screens with motion. Elsewhere the desk scrolls away as before.
 */
export const curtainQuery =
  "screen and (min-width: 761px) and (min-height: 621px) and (prefers-reduced-motion: no-preference)";

/**
 * How far the curtain has drawn the desk aside, 0–1, published by the
 * journey every scroll frame and read by the About scene in its own frame
 * loop. 1 whenever there is no curtain, so About rests in place.
 */
export const curtainProgress = signal(1);
