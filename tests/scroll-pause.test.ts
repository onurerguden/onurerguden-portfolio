import { afterEach, describe, expect, it, vi } from "vitest";
import { afterScrollPause } from "../src/lib/scroll-pause";

describe("scroll pause", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for a quiet spell after the last scroll", async () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const done = vi.fn();
    afterScrollPause(150, 1500, undefined, target).then(done);
    await vi.advanceTimersByTimeAsync(100);
    target.dispatchEvent(new Event("wheel"));
    await vi.advanceTimersByTimeAsync(100);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("gives up waiting after the limit, and never resolves once aborted", async () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const done = vi.fn();
    afterScrollPause(150, 1500, undefined, target).then(done);
    for (let t = 0; t < 1400; t += 100) {
      target.dispatchEvent(new Event("scroll"));
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toHaveBeenCalledTimes(1);

    const controller = new AbortController();
    const aborted = vi.fn();
    afterScrollPause(150, 1500, controller.signal, target).then(aborted);
    controller.abort();
    await vi.advanceTimersByTimeAsync(2000);
    expect(aborted).not.toHaveBeenCalled();
  });
});
