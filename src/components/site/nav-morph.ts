/** Where the bar and its items sit in one state, in layout px. */
type NavShape = {
  width: number;
  height: number;
  items: Map<Element, { x: number; y: number }>;
};

function shapeOf(nav: HTMLElement): NavShape {
  const items = new Map<Element, { x: number; y: number }>();
  // Offsets ignore transforms, so a morph under way never skews them; the
  // bar is centred on its left edge and keeps its top in both states.
  const left = nav.offsetLeft - nav.offsetWidth / 2;
  for (const item of nav.children) {
    if (!(item instanceof HTMLElement)) continue;
    items.set(item, {
      x: left + item.offsetLeft + item.offsetWidth / 2,
      y: item.offsetTop + item.offsetHeight / 2,
    });
  }
  return { width: nav.offsetWidth, height: nav.offsetHeight, items };
}

const timing = {
  duration: 420,
  easing: "cubic-bezier(0.2, 0.9, 0.2, 1)",
} as const;

/**
 * Over the desk the bar grows when the pointer nears it (`:hover` or
 * `data-revealed`, site-nav.module.css). It takes its new size in one
 * layout, then plays the change from where everything was: the surface
 * scales and each item slides, on the compositor. Each state's shape is
 * kept from when it was last laid out, so nothing is measured before the
 * change; reduced motion keeps the plain step. Returns the cleanup.
 */
export function morphNav(nav: HTMLElement) {
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const shapes: Partial<Record<"wide" | "compact", NavShape>> = {};
  let hovered = nav.matches(":hover");
  let state: "wide" | "compact" = "compact";
  let running: Animation[] = [];
  let frame = 0;
  const want = () =>
    fine.matches && (hovered || nav.dataset.revealed === "true")
      ? "wide"
      : "compact";
  // The scale and offsets a morph under way currently shows.
  const scaleNow = () => {
    const matrix = getComputedStyle(nav, "::after").transform;
    if (!matrix.startsWith("matrix(")) return [1, 1];
    const [a, , , d] = matrix.slice(7).split(",").map(parseFloat);
    return [a, d];
  };
  const offsetNow = (item: Element) => {
    const [x = 0, y = 0] = getComputedStyle(item)
      .translate.split(" ")
      .map(parseFloat);
    return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
  };
  const check = () => {
    frame = 0;
    const next = want();
    if (next === state) return;
    const before = shapes[state];
    // Laid out in the new state by now (this runs before the frame).
    const after = shapeOf(nav);
    shapes[next] = after;
    state = next;
    if (!before || reduced.matches) {
      running.forEach((animation) => animation.cancel());
      running = [];
      return;
    }
    const [sx, sy] = running.length ? scaleNow() : [1, 1];
    const offsets = new Map(
      [...after.items.keys()].map((item) => [
        item,
        running.length ? offsetNow(item) : { x: 0, y: 0 },
      ]),
    );
    running.forEach((animation) => animation.cancel());
    const scale = `scale(${(before.width * sx) / after.width}, ${
      (before.height * sy) / after.height
    })`;
    running = ["::after", "::before"].map((pseudoElement) =>
      nav.animate({ transform: [scale, "none"] }, { ...timing, pseudoElement }),
    );
    for (const [item, to] of after.items) {
      const from = before.items.get(item);
      const offset = offsets.get(item)!;
      if (!from) continue;
      const x = from.x + offset.x - to.x;
      const y = from.y + offset.y - to.y;
      if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) continue;
      running.push(
        item.animate({ translate: [`${x}px ${y}px`, "0px 0px"] }, timing),
      );
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(check);
  };
  // A resize or the fonts arriving reshape both states; the one on screen
  // is measured again and the other waits for its next layout.
  const remeasure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      delete shapes.wide;
      delete shapes.compact;
      state = want();
      shapes[state] = shapeOf(nav);
    });
  };
  const enter = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    hovered = true;
    schedule();
  };
  const leave = () => {
    hovered = false;
    schedule();
  };
  const revealed = new MutationObserver(schedule);
  revealed.observe(nav, { attributeFilter: ["data-revealed"] });
  nav.addEventListener("pointerenter", enter);
  nav.addEventListener("pointerleave", leave);
  window.addEventListener("resize", remeasure);
  let live = true;
  document.fonts?.ready.then(() => {
    if (live) remeasure();
  });
  remeasure();
  return () => {
    live = false;
    cancelAnimationFrame(frame);
    revealed.disconnect();
    nav.removeEventListener("pointerenter", enter);
    nav.removeEventListener("pointerleave", leave);
    window.removeEventListener("resize", remeasure);
    running.forEach((animation) => animation.cancel());
  };
}
