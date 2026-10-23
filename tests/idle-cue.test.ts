import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createIdleCue,
  cueFor,
  idleCueAfter,
} from "../src/lib/desk-story/idle-cue";
import {
  buildTimeline,
  storyAt,
  roomDistance,
} from "../src/lib/desk-story/timeline";
import type { StoryState } from "../src/lib/desk-story/timeline";

describe("idle cue placement", () => {
  const at = (state: Partial<StoryState>) =>
    ({ distance: 0, exit: 0, segment: "hold", ...state }) as StoryState;

  it("plays beside the portrait on the opening and at the foot elsewhere", () => {
    expect(cueFor(at({ distance: 0 }), 8)).toBe("opening");
    expect(cueFor(at({ distance: 0.149 }), 8)).toBe("opening");
    expect(cueFor(at({ distance: 0.15, segment: "travel" }), 8)).toBe("bottom");
    expect(cueFor(at({ distance: 4, segment: "read" }), 8)).toBe("bottom");
  });

  it("stays away once the desk is drawn aside or scrolled past", () => {
    expect(cueFor(at({ distance: 7, segment: "exit", exit: 0 }), 8)).toBeNull();
    expect(
      cueFor(at({ distance: 7.5, segment: "exit", exit: 0.4 }), 8),
    ).toBeNull();
    expect(cueFor(at({ distance: 8 }), 8)).toBeNull();
  });

  it("plays at the foot in the final view of a real timeline", () => {
    const timeline = buildTimeline();
    const room = roomDistance(timeline);
    expect(cueFor(storyAt(timeline, room + 0.1), timeline.length)).toBe(
      "bottom",
    );
  });
});

describe("idle cue timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = (quiet = idleCueAfter) => {
    const target = new EventTarget();
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const stop = createIdleCue(target, { quiet, onIdle, onActive });
    const input = (type: string) => target.dispatchEvent(new Event(type));
    return { onIdle, onActive, stop, input };
  };

  it("waits six seconds of quiet by default", () => {
    const { onIdle } = setup();
    vi.advanceTimersByTime(5999);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledOnce();
  });

  it("starts the wait again on every input", () => {
    const { onIdle, onActive, input } = setup();
    for (const type of [
      "wheel",
      "scroll",
      "keydown",
      "touchmove",
      "pointerdown",
    ]) {
      vi.advanceTimersByTime(4000);
      input(type);
    }
    expect(onActive).toHaveBeenCalledTimes(5);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(6000);
    expect(onIdle).toHaveBeenCalledOnce();
  });

  it("plays once per spell: only moving through the story arms it again", () => {
    const { onIdle, input } = setup();
    vi.advanceTimersByTime(6000);
    expect(onIdle).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(60000);
    expect(onIdle).toHaveBeenCalledOnce();
    // A click on a desk object is not a scroll.
    input("pointerdown");
    vi.advanceTimersByTime(6000);
    expect(onIdle).toHaveBeenCalledOnce();
    input("wheel");
    vi.advanceTimersByTime(6000);
    expect(onIdle).toHaveBeenCalledTimes(2);
  });

  it("waits again when the cue cannot play yet", () => {
    const target = new EventTarget();
    const onIdle = vi.fn().mockReturnValueOnce(false);
    createIdleCue(target, { quiet: 1000, onIdle, onActive: () => {} });
    vi.advanceTimersByTime(1000);
    expect(onIdle).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1000);
    expect(onIdle).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5000);
    expect(onIdle).toHaveBeenCalledTimes(2);
  });

  it("stops listening when it is removed", () => {
    const { onIdle, onActive, stop, input } = setup();
    stop();
    input("wheel");
    vi.advanceTimersByTime(60000);
    expect(onIdle).not.toHaveBeenCalled();
    expect(onActive).not.toHaveBeenCalled();
  });
});
