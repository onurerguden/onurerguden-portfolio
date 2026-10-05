import { describe, expect, it, vi } from "vitest";
import { signal } from "../src/lib/desk-story/signal";

describe("signal", () => {
  it("notifies listeners only when the value changes", () => {
    const distance = signal(0);
    const listener = vi.fn();
    const off = distance.on(listener);
    distance.set(0);
    expect(listener).not.toHaveBeenCalled();
    distance.set(1.5);
    expect(listener).toHaveBeenCalledWith(1.5);
    expect(distance.get()).toBe(1.5);
    off();
    distance.set(2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(distance.get()).toBe(2);
  });
});
