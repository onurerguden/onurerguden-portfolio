import { describe, expect, it } from "vitest";
import {
  createScrollInput,
  createStoryClock,
  halfLives,
  rawStory,
} from "../src/lib/desk-story/clock";

/** A clock on fake frames `interval` ms apart; returns what it showed. */
function clockAt(interval: number) {
  let now = 0;
  let queued: ((now: number) => void) | null = null;
  const shown: [number, boolean][] = [];
  const clock = createStoryClock({
    apply: (d, settled) => shown.push([d, settled]),
    frames: {
      request: (callback) => {
        queued = callback;
        return 1;
      },
      cancel: () => {
        queued = null;
      },
      now: () => now,
    },
  });
  return {
    clock,
    shown,
    /** Runs frames for `ms`; returns how many ran. */
    run(ms: number) {
      let count = 0;
      for (const end = now + ms; queued && now < end; count++) {
        now += interval;
        const callback = queued;
        queued = null;
        callback(now);
      }
      return count;
    },
  };
}

describe("story clock", () => {
  it("follows other scrolling at once", () => {
    const { clock, shown } = clockAt(16.7);
    clock.to(0.4, 0);
    expect(shown).toEqual([[0.4, true]]);
    expect(clock.settled).toBe(true);
  });
  it("eases a wheel notch into a glide that settles", () => {
    const { clock, shown, run } = clockAt(16.7);
    clock.to(0.1, 80);
    // The first step lands with the scroll event itself.
    expect(shown[0][0]).toBeGreaterThan(0);
    expect(shown[0][0]).toBeLessThan(0.1);
    run(1000);
    expect(clock.value).toBe(0.1);
    expect(shown.at(-1)).toEqual([0.1, true]);
    const steps = shown.map(([d], i) => d - (i ? shown[i - 1][0] : 0));
    // Each frame moves less than the last: no lurch after the first.
    for (let i = 1; i < steps.length - 1; i++)
      expect(steps[i]).toBeLessThanOrEqual(steps[i - 1] + 1e-9);
  });
  it("glides alike at 60 and 120 Hz", () => {
    const at60 = clockAt(1000 / 60);
    const at120 = clockAt(1000 / 120);
    at60.clock.to(1, 80);
    at120.clock.to(1, 80);
    // Six frames at 60 Hz, twelve at 120: the same 100 ms.
    at60.run(99);
    at120.run(99);
    expect(Math.abs(at60.clock.value - at120.clock.value)).toBeLessThan(1e-9);
  });
  it("cuts a jump of several views instead of flying through the desk", () => {
    const { clock, shown } = clockAt(16.7);
    clock.to(4, 80);
    expect(shown).toEqual([[4, true]]);
  });
  it("retargets a glide under way without restarting it", () => {
    const { clock, run } = clockAt(16.7);
    clock.to(0.2, 80);
    const frames = run(50);
    clock.to(0.4, 80);
    expect(run(2000)).toBeGreaterThan(frames);
    expect(clock.value).toBe(0.4);
    expect(clock.target).toBe(0.4);
  });
});

describe("scroll input", () => {
  const input = () => {
    let now = 0;
    const tracker = createScrollInput(() => now);
    return { tracker, at: (time: number) => (now = time) };
  };
  it("tells a mouse wheel's notches from a trackpad's stream", () => {
    const { tracker, at } = input();
    at(0);
    tracker.wheel({ deltaMode: 0, deltaY: 100 });
    expect(tracker.current()).toBe("notch");
    for (let t = 200; t < 300; t += 10) {
      at(t);
      tracker.wheel({ deltaMode: 0, deltaY: t === 250 ? 60 : 8 });
    }
    expect(tracker.current()).toBe("wheel");
    at(400);
    tracker.wheel({ deltaMode: 1, deltaY: 3 });
    expect(tracker.current()).toBe("notch");
  });
  it("counts the keys that scroll, and only for a moment", () => {
    const { tracker, at } = input();
    tracker.key({ key: "Tab", defaultPrevented: false });
    expect(tracker.current()).toBe("other");
    tracker.key({ key: "PageDown", defaultPrevented: false });
    expect(tracker.current()).toBe("keys");
    at(700);
    expect(tracker.current()).toBe("other");
  });
  it("follows touch and clicks 1:1", () => {
    const { tracker } = input();
    tracker.wheel({ deltaMode: 0, deltaY: 120 });
    tracker.other();
    expect(halfLives[tracker.current()]).toBe(0);
  });
  it("can be turned off for a side-by-side comparison", () => {
    expect(rawStory(null, "?story=raw")).toBe(true);
    expect(rawStory("raw", "")).toBe(true);
    expect(rawStory(null, "?story=smooth")).toBe(false);
  });
});
