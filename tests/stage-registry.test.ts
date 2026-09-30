import { describe, it, expect, vi } from "vitest";
import {
  allocateStages,
  createStageRegistry,
  type StageRequest,
} from "../src/lib/stage-registry";

const stage = (
  id: string,
  state: Partial<StageRequest> = {},
): StageRequest => ({
  id,
  priority: 1,
  visible: false,
  wanted: true,
  order: 0,
  ...state,
});

describe("WebGL stage allocation", () => {
  it("never grants more contexts than the limit", () => {
    const live = allocateStages(
      [stage("a"), stage("b", { order: 1 }), stage("c", { order: 2 })],
      new Set(),
    );
    expect([...live]).toEqual(["a", "b"]);
  });
  it("prefers visible stages over higher-priority offscreen ones", () => {
    const live = allocateStages(
      [
        stage("journey", { priority: 3 }),
        stage("about", { visible: true }),
        stage("stack", { visible: true, order: 1 }),
      ],
      new Set(["journey", "about"]),
    );
    expect(live).toEqual(new Set(["about", "stack"]));
  });
  it("lets the journey outrank a section that is only preloading", () => {
    const live = allocateStages(
      [
        stage("about", { visible: true }),
        stage("stack", { order: 1 }),
        stage("journey", { priority: 3, order: 2 }),
      ],
      new Set(["about", "stack"]),
    );
    expect(live).toEqual(new Set(["about", "journey"]));
  });
  it("keeps a live stage instead of swapping two equal ones", () => {
    const live = allocateStages(
      [stage("a"), stage("b", { order: 1 }), stage("c", { order: 2 })],
      new Set(["a", "c"]),
    );
    expect(live).toEqual(new Set(["a", "c"]));
  });
  it("drops stages that are neither near nor visible", () => {
    const live = allocateStages(
      [stage("far", { wanted: false }), stage("near")],
      new Set(["far"]),
    );
    expect(live).toEqual(new Set(["near"]));
  });
});

describe("stage registry store", () => {
  it("notifies only when the live set changes", () => {
    const registry = createStageRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);
    registry.update("journey", { priority: 3, visible: true, wanted: true });
    expect(registry.isLive("journey")).toBe(true);
    registry.update("journey", { priority: 3, visible: true, wanted: true });
    registry.update("about", { priority: 1, visible: false, wanted: true });
    expect(listener).toHaveBeenCalledTimes(2);
    registry.update("stack", { priority: 1, visible: false, wanted: true });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(registry.isLive("stack")).toBe(false);
  });
  it("hands a released slot to the waiting stage", () => {
    const registry = createStageRegistry();
    registry.update("journey", { priority: 3, visible: false, wanted: true });
    registry.update("about", { priority: 1, visible: true, wanted: true });
    registry.update("stack", { priority: 1, visible: false, wanted: true });
    expect(registry.isLive("stack")).toBe(false);
    registry.update("journey", { priority: 3, visible: false, wanted: false });
    expect(registry.isLive("journey")).toBe(false);
    expect(registry.isLive("stack")).toBe(true);
    registry.remove("about");
    expect([...registry.liveIds()]).toEqual(["stack"]);
  });
});
