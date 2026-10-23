import { afterEach, describe, expect, it, vi } from "vitest";
import { frameSlices, whenIdle, yieldToFrame } from "../src/lib/yield";

describe("yielding a frame", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resumes in a task queued after the next animation frame", async () => {
    const order: string[] = [];
    let frame: FrameRequestCallback | null = null;
    vi.stubGlobal("document", { visibilityState: "visible" });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    const resumed = yieldToFrame().then(() => order.push("resumed"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(order).toEqual([]);
    expect(frame).not.toBeNull();
    frame!(0);
    // Not inside the frame callback itself: after it, in a task of its own.
    order.push("frame");
    await resumed;
    expect(order).toEqual(["frame", "resumed"]);
  });

  it("falls back to a task on a hidden page, which draws no frames", async () => {
    const frame = vi.fn();
    vi.stubGlobal("document", { visibilityState: "hidden" });
    vi.stubGlobal("requestAnimationFrame", frame);
    await yieldToFrame();
    expect(frame).not.toHaveBeenCalled();
  });

  it("slices work by its budget and yields only once it is spent", async () => {
    let time = 0;
    let frames = 0;
    vi.stubGlobal("document", { visibilityState: "visible" });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames++;
      setTimeout(() => callback(time), 0);
      return frames;
    });
    const slice = frameSlices(6, () => time);
    const startedAt: number[] = [];
    for (let step = 0; step < 6; step++) {
      await slice();
      startedAt.push(frames);
      time += 2;
    }
    // Three 2 ms steps fill a 6 ms slice; the fourth waits for a frame.
    expect(startedAt).toEqual([0, 0, 0, 1, 1, 1]);
  });
});

describe("waiting for an idle moment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("cancels an idle callback without clearing a timer that shares its number", () => {
    const cancelIdle = vi.fn();
    vi.stubGlobal("requestIdleCallback", () => 3);
    vi.stubGlobal("cancelIdleCallback", cancelIdle);
    const clearTimer = vi.spyOn(globalThis, "clearTimeout");
    const cancel = whenIdle(() => {}, { timeout: 1000, fallback: 100 });
    cancel();
    expect(cancelIdle).toHaveBeenCalledWith(3);
    expect(clearTimer).not.toHaveBeenCalled();
  });

  it("falls back to a timer where idle callbacks are missing", () => {
    vi.useFakeTimers();
    try {
      const callback = vi.fn();
      whenIdle(callback, { timeout: 1000, fallback: 100 });
      vi.advanceTimersByTime(99);
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledOnce();
      const cancelled = vi.fn();
      whenIdle(cancelled, { timeout: 1000, fallback: 100 })();
      vi.advanceTimersByTime(200);
      expect(cancelled).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
