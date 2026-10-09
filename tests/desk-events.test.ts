import { describe, expect, it, vi } from "vitest";
import type { RootStore } from "@react-three/fiber";
import { deskEvents } from "../src/components/desk/desk-events";

/** Just enough of R3F's store for connecting and leaving. */
function fakeStore() {
  const state = {
    set: vi.fn(),
    events: {} as ReturnType<typeof deskEvents>,
    internal: { hovered: new Map() },
  };
  return { state, store: { getState: () => state } as unknown as RootStore };
}

describe("desk pointer events", () => {
  it("never listen for the wheel", () => {
    const { state, store } = fakeStore();
    const manager = deskEvents(store);
    state.events = manager;
    const target = { addEventListener: vi.fn() };
    manager.connect!(target as unknown as HTMLElement);
    const names = target.addEventListener.mock.calls.map(([name]) => name);
    expect(names).not.toContain("wheel");
    expect(names).toEqual(
      expect.arrayContaining(["click", "pointerdown", "pointermove"]),
    );
  });

  it("skip hover hit tests while asked to", () => {
    const { state, store } = fakeStore();
    const getState = vi.spyOn(store, "getState");
    let travelling = true;
    const manager = deskEvents(store, () => travelling);
    state.events = manager;
    const move = new Event("pointermove");
    manager.handlers!.onPointerMove(move);
    manager.handlers!.onPointerMove(move);
    // The first skipped move ends any hover; later ones touch nothing.
    expect(getState).toHaveBeenCalledTimes(1);
    travelling = false;
    // Now the move is hit-tested again, which needs the full store.
    expect(() => manager.handlers!.onPointerMove(move)).toThrow();
  });
});
