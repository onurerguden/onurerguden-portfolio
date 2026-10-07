/**
 * The custom cursor's pure parts: which look a hovered element asks for, and
 * the ring's frame-rate-independent easing towards the pointer.
 */
export type CursorLook = "default" | "action" | "native";

/** Fields and grab areas keep the system cursor (caret, grab hand). */
export const nativeCursorSelector = [
  "input:not([type=button],[type=submit],[type=reset],[type=checkbox],[type=radio],[type=range],[type=color],[type=file])",
  "textarea",
  "[contenteditable]:not([contenteditable=false])",
  "[data-ball-grabbable=true]",
  "[data-ball-dragging=true]",
  "dialog",
].join(",");

/** Anything that acts on a click; the ring opens around it. */
export const actionCursorSelector = [
  "a[href]",
  "button:not(:disabled)",
  "summary",
  "label[for]",
  "select",
  "input[type=checkbox]",
  "input[type=radio]",
  "input[type=submit]",
  "input[type=button]",
  "[role=button]",
  "[role=link]",
  "[role=tab]",
  "[role=menuitem]",
  "[role=option]",
].join(",");

export function cursorLook(target: Element | null): CursorLook {
  if (!target) return "default";
  if (target.closest(nativeCursorSelector)) return "native";
  if (target.closest(actionCursorSelector)) return "action";
  // The desk's canvas marks clickable objects with an inline pointer cursor.
  if (
    target instanceof HTMLElement &&
    target.tagName === "CANVAS" &&
    target.style.cursor === "pointer"
  )
    return "action";
  return "default";
}

/**
 * Moves `from` towards `to` so that about `1 - 2^(-dt / halfLife)` of the gap
 * closes in `dt` ms, independent of the display's refresh rate.
 */
export function follow(from: number, to: number, dt: number, halfLife = 45) {
  if (halfLife <= 0) return to;
  return to + (from - to) * Math.pow(2, -dt / halfLife);
}

/** The ring has caught up when it is within a fifth of a pixel. */
export const caughtUp = (dx: number, dy: number) => dx * dx + dy * dy < 0.04;
