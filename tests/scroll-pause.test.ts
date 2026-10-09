import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createScrollPause } from "../src/lib/scroll-pause";

describe("scroll pause", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () => {
    const target = new EventTarget();
    const pause = createScrollPause(target, () => Date.now());
    const input = (type = "wheel") => target.dispatchEvent(new Event(type));
    return { pause, input };
  };

  it("watches a whole quiet period before trusting a still page", () => {
    const { pause } = setup();
    const callback = vi.fn();
    pause.when(callback);
    vi.advanceTimersByTime(199);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("never runs inside the caller's task", () => {
    const { pause } = setup();
    pause.when(() => {});
    vi.advanceTimersByTime(500);
    const callback = vi.fn();
    pause.when(callback);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("waits while wheel, touch or scroll input keeps coming", () => {
    const { pause, input } = setup();
    const callback = vi.fn();
    pause.when(callback);
    for (const type of ["wheel", "touchstart", "touchmove", "scroll"]) {
      vi.advanceTimersByTime(150);
      input(type);
    }
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(199);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("runs after the cap however long the scrolling lasts", () => {
    const { pause, input } = setup();
    const callback = vi.fn();
    pause.when(callback, { cap: 3000 });
    for (let time = 0; time < 2900; time += 100) {
      input();
      vi.advanceTimersByTime(100);
    }
    expect(callback).not.toHaveBeenCalled();
    input();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("can be cancelled", () => {
    const { pause } = setup();
    const callback = vi.fn();
    const cancel = pause.when(callback);
    vi.advanceTimersByTime(100);
    cancel();
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });
});
