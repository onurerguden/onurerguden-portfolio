import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  creep,
  loadProgress,
  loadStages,
  nextStage,
  reportLoad,
  resetLoad,
} from "../src/lib/desk-story/load-progress";
import {
  createScrollHold,
  holdCap,
  holds,
} from "../src/lib/desk-story/scroll-hold";

/** An event as the browser would deliver it, without a DOM. */
function input(
  type: string,
  fields: Record<string, unknown> = {},
  target: unknown = null,
) {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(fields))
    Object.defineProperty(event, key, { value });
  if (target) Object.defineProperty(event, "target", { value: target });
  return event;
}
/** An element whose ancestors match `selectors`. */
const inside = (match: (selector: string) => boolean) => ({
  closest: (selector: string) => (match(selector) ? {} : null),
});

describe("load progress", () => {
  afterEach(() => resetLoad());

  it("orders the stages from turning on to showing", () => {
    const values = Object.values(loadStages);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(loadStages.ready).toBe(1);
    expect(nextStage(0)).toBe(loadStages.enabled);
    expect(nextStage(loadStages.model)).toBe(loadStages.textures);
    expect(nextStage(1)).toBe(1);
  });

  it("never goes back when a stage reports late", () => {
    reportLoad("model");
    reportLoad("code");
    expect(loadProgress.get()).toBe(loadStages.model);
    resetLoad();
    expect(loadProgress.get()).toBe(0);
  });

  it("creeps towards the next stage without reaching it", () => {
    const reached = loadStages.code;
    const next = nextStage(reached);
    expect(creep(reached, 0)).toBe(reached);
    expect(creep(reached, 1000)).toBeGreaterThan(reached);
    expect(creep(reached, 60_000)).toBeLessThan(next);
    expect(creep(reached, 2000)).toBeGreaterThan(creep(reached, 1000));
  });
});

describe("scroll hold", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("holds wheel, touch drags and the page's scrolling keys", () => {
    expect(holds(input("wheel", { deltaY: 100 }))).toBe(true);
    expect(holds(input("touchmove"))).toBe(true);
    for (const key of [" ", "PageDown", "ArrowDown", "End"])
      expect(holds(input("keydown", { key })), key).toBe(true);
  });

  it("leaves zoom, upward scrolling, other keys, controls and menus alone", () => {
    expect(holds(input("wheel", { deltaY: 100, ctrlKey: true }))).toBe(false);
    expect(holds(input("wheel", { deltaY: -100 }))).toBe(false);
    expect(holds(input("keydown", { key: "Tab" }))).toBe(false);
    expect(holds(input("keydown", { key: " ", shiftKey: true }))).toBe(false);
    expect(holds(input("keydown", { key: "ArrowDown", altKey: true }))).toBe(
      false,
    );
    // Space presses a focused button.
    const button = inside((selector) => selector.includes("button"));
    expect(holds(input("keydown", { key: " " }, button))).toBe(false);
    // The Sections menu scrolls on its own.
    const menu = inside((selector) => selector.includes("nav"));
    expect(holds(input("wheel", { deltaY: 100 }, menu))).toBe(false);
  });

  it("cancels held input and reports it", () => {
    const target = new EventTarget();
    const onHeld = vi.fn();
    createScrollHold(target, { onHeld });
    const wheel = input("wheel", { deltaY: 120 });
    target.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(onHeld).toHaveBeenCalledOnce();
    const zoom = input("wheel", { deltaY: 120, ctrlKey: true });
    target.dispatchEvent(zoom);
    expect(zoom.defaultPrevented).toBe(false);
  });

  it("lets go after five seconds at most", () => {
    expect(holdCap).toBe(5000);
    const target = new EventTarget();
    const onRelease = vi.fn();
    const hold = createScrollHold(target, { onRelease });
    vi.advanceTimersByTime(4999);
    expect(hold.held).toBe(true);
    vi.advanceTimersByTime(1);
    expect(hold.held).toBe(false);
    expect(onRelease).toHaveBeenCalledOnce();
    const wheel = input("wheel", { deltaY: 120 });
    target.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
  });

  it("lets go once when released early, and the cap then does nothing", () => {
    const target = new EventTarget();
    const onRelease = vi.fn();
    const hold = createScrollHold(target, { onRelease });
    hold.release();
    hold.release();
    vi.advanceTimersByTime(holdCap);
    expect(onRelease).toHaveBeenCalledOnce();
  });
});
