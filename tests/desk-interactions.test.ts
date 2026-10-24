import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  accessoryPose,
  lampColors,
  drawerIds,
  drawerOffset,
  drawerPress,
  drawerPressOffset,
  drawerWave,
  hopPose,
  hoverDuration,
  hoverLevel,
  hoverLift,
  lampNod,
  pickTease,
  posedObjects,
  pressDepth,
  pressDuration,
  pressLead,
  pressScale,
  rippleRing,
  tabletDip,
  teaseDim,
  teaseDue,
  teaseLift,
  teaseRules,
} from "../src/lib/desk-interaction-motion";
import { cursorLook } from "../src/lib/cursor";
import { createDeskAudio, type AudioStatus } from "../src/lib/desk-audio";
import contract from "../src/lib/desk-interactions.json";

describe("desk interaction model contract", () => {
  const bytes = readFileSync("public/models/desk/onur-desk.glb");
  const gltf = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  it("keeps independently movable groups and neutral receiver maps", () => {
    for (const [id, entry] of Object.entries(contract.objects)) {
      const node = gltf.nodes.find(
        (node: { name: string }) => node.name === entry.node,
      );
      expect(node, id).toBeDefined();
      expect(node.children.length).toBeGreaterThan(0);
      for (const index of node.children)
        expect(gltf.nodes[index].extras.interaction).toBe(id);
    }
    expect(
      gltf.materials.some((m: { name: string }) => m.name.startsWith("Baked ")),
    ).toBe(false);
    expect(
      gltf.materials.filter((m: { name: string }) =>
        m.name.startsWith("Neutral "),
      ),
    ).toHaveLength(2);
    const headphones = gltf.nodes.find(
      (node: { name: string }) =>
        node.name === contract.objects.headphones.node,
    );
    expect(
      headphones.children.every(
        (i: number) => gltf.nodes[i].extras.interaction === "headphones",
      ),
    ).toBe(true);
  });
});
describe("bounded accessory motion", () => {
  it("returns exactly to its authored pose and keeps all five mouse paths on the mat", () => {
    for (const id of ["mouse", "headphones", "tablet"] as const) {
      for (const t of [0, 1, 2])
        expect(accessoryPose(id, t)).toEqual({ x: 0, y: 0, z: 0, rotation: 0 });
    }
    const paths = new Set();
    for (let variant = 0; variant < 5; variant++) {
      paths.add(JSON.stringify(accessoryPose("mouse", 0.3, variant)));
      for (let step = 0; step <= 100; step++) {
        const p = accessoryPose("mouse", step / 100, variant);
        expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(0.020001);
        expect(p.y).toBe(0);
      }
    }
    expect(paths.size).toBe(5);
  });
  it("keeps the pencil clear of the tablet edge, mat and laptop rest", () => {
    for (let step = 0; step <= 100; step++) {
      const p = accessoryPose("tablet", step / 100);
      const center = contract.objects.pencil.pivot;
      expect(center[0] + p.x - 0.004).toBeGreaterThan(-0.435 + 0.176 / 2);
      expect(center[1] + p.y - 0.004).toBeGreaterThanOrEqual(0.004 - 1e-9);
      expect(center[0] + p.x + 0.004).toBeLessThan(-0.3);
    }
    expect(lampColors).toHaveLength(5);
  });
});

describe("user-initiated music", () => {
  function setup(src?: string) {
    const statuses: AudioStatus[] = [];
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const audio = {
      play: vi.fn(
        () =>
          new Promise<void>((yes, no) => {
            resolve = yes;
            reject = no;
          }),
      ),
      pause: vi.fn(),
      load: vi.fn(),
      removeAttribute: vi.fn(),
      onended: null,
      onerror: null,
    };
    const factory = vi.fn(() => audio as unknown as HTMLAudioElement);
    const player = createDeskAudio({ src }, (s) => statuses.push(s), factory);
    return {
      player,
      audio,
      factory,
      statuses,
      resolve: () => resolve(),
      reject: () => reject(new Error("blocked")),
    };
  }
  it("does not construct or load audio until a configured track is selected", () => {
    const s = setup();
    expect(s.factory).not.toHaveBeenCalled();
    s.player.toggle();
    expect(s.statuses).toEqual(["missing"]);
    expect(s.factory).not.toHaveBeenCalled();
  });
  it("pauses a pending play without a late promise restoring playing state", async () => {
    const s = setup("/music/supplied.mp3");
    s.player.toggle();
    s.player.toggle();
    s.resolve();
    await Promise.resolve();
    expect(s.statuses).toEqual(["loading", "paused"]);
    expect(s.audio.pause).toHaveBeenCalled();
  });
  it("handles successful play, pause on leaving, failure and disposal", async () => {
    const s = setup("/music/supplied.mp3");
    s.player.toggle();
    s.resolve();
    await Promise.resolve();
    expect(s.statuses.at(-1)).toBe("playing");
    s.player.pause();
    expect(s.statuses.at(-1)).toBe("paused");
    s.player.toggle();
    s.reject();
    await Promise.resolve();
    await Promise.resolve();
    expect(s.statuses.at(-1)).toBe("error");
    s.player.toggle();
    s.player.dispose();
    s.resolve();
    await Promise.resolve();
    expect(s.statuses.at(-1)).toBe("loading");
    expect(s.audio.removeAttribute).toHaveBeenCalledWith("src");
    expect(s.audio.load).toHaveBeenCalled();
  });
});

describe("drawer supports and wave clearance", () => {
  it("uses four vertically separated drawers aligned to the wrist rest", () => {
    expect(contract.cabinet.left).toBeCloseTo(0.393, 3);
    expect(contract.cabinet.right - contract.cabinet.left).toBeCloseTo(0.34);
    expect(contract.cabinet.depth).toBeCloseTo(0.76);
    const pivots = drawerIds.map((id) => contract.objects[id].pivot);
    for (let i = 0; i < pivots.length; i++) {
      expect(pivots[i][0]).toBeCloseTo(
        (contract.cabinet.left + contract.cabinet.right) / 2,
      );
      expect(pivots[i][1] + 0.073).toBeLessThan(contract.cabinet.top);
      expect(pivots[i][1] - 0.073).toBeGreaterThan(contract.cabinet.floor);
      if (i) expect(pivots[i - 1][1] - pivots[i][1]).toBeGreaterThan(0.146);
    }
  });
  it("stagger-opens top to bottom, stays half open at most and returns exactly", () => {
    for (let i = 0; i < 4; i++) {
      const peak = drawerWave.stroke / 2 + i * drawerWave.stagger;
      expect(drawerOffset(peak, i)).toBeCloseTo(
        contract.cabinet.drawerDepth / 4,
      );
      expect(drawerOffset(i * drawerWave.stagger, i)).toBe(0);
      for (let time = -20; time <= drawerWave.duration + 20; time += 10) {
        expect(drawerOffset(time, i)).toBeGreaterThanOrEqual(0);
        expect(drawerOffset(time, i)).toBeLessThanOrEqual(
          contract.cabinet.drawerTravel,
        );
      }
      expect(drawerOffset(drawerWave.duration, i)).toBe(0);
      expect(drawerOffset(drawerWave.duration + 500, i)).toBe(0);
    }
    expect(drawerOffset(100, 0)).toBeGreaterThan(0);
    expect(drawerOffset(100, 1)).toBe(0);
  });
});

describe("presses, hops, hovers and teases (October 24)", () => {
  const span = <T>(f: (t: number) => T) =>
    Array.from({ length: 201 }, (_, i) => f(i / 200));
  it("rests exactly outside each motion's span", () => {
    for (const t of [-1, 0, 1, 2]) {
      expect(pressScale(t, 0.15)).toBe(1);
      expect(lampNod(t)).toBe(0);
      expect(tabletDip(t)).toBe(0);
      expect(hopPose(t)).toEqual({ y: 0, rotation: 0, scale: 1 });
      expect(teaseLift(t)).toBe(0);
      expect(teaseDim(t)).toBe(1);
      expect(rippleRing(t, 0)).toEqual({ radius: 0, opacity: 0 });
    }
    expect(drawerPressOffset(0)).toBe(0);
    expect(drawerPressOffset(drawerPress.duration)).toBe(0);
  });
  it("presses down, rebounds a little and stays in bounds", () => {
    for (const id of posedObjects) {
      const scales = span((t) => pressScale(t, pressDepth[id]));
      expect(Math.min(...scales)).toBeGreaterThanOrEqual(
        1 - pressDepth[id] - 1e-9,
      );
      expect(Math.max(...scales)).toBeLessThanOrEqual(1 + pressDepth[id] * 0.2);
    }
    // The press bottoms out before the click's own change shows.
    expect(pressScale(pressLead / pressDuration, 0.15)).toBeLessThan(0.9);
    expect(Math.max(...span(lampNod))).toBeLessThan((3 * Math.PI) / 180);
    expect(Math.min(...span(tabletDip))).toBeGreaterThanOrEqual(-0.002);
  });
  it("hops the headphones about 30 mm with a crouch and a landing", () => {
    const hops = span(hopPose);
    expect(Math.max(...hops.map((p) => p.y))).toBeCloseTo(0.03, 3);
    expect(hopPose(0.1).scale).toBeLessThan(1);
    expect(hopPose(0.8).scale).toBeLessThan(1);
    for (const p of hops) {
      expect(p.scale).toBeGreaterThan(0.9);
      expect(Math.abs(p.rotation)).toBeLessThan(0.05);
    }
    // Continuous where its phases meet.
    for (const at of [0.15, 0.6]) {
      const before = hopPose(at - 1e-6);
      const after = hopPose(at + 1e-6);
      expect(after.scale).toBeCloseTo(before.scale, 4);
      expect(after.y).toBeCloseTo(before.y, 4);
    }
  });
  it("clicks a drawer in before the wave and never past its front", () => {
    for (let ms = 0; ms <= drawerPress.duration; ms += 5) {
      expect(drawerPressOffset(ms)).toBeLessThanOrEqual(0);
      expect(drawerPressOffset(ms)).toBeGreaterThanOrEqual(-drawerPress.depth);
    }
    expect(drawerPress.lead).toBeLessThan(drawerPress.duration);
  });
  it("eases hover up and down without overshoot", () => {
    expect(hoverLevel(0, 1, 0)).toBe(0);
    expect(hoverLevel(0, 1, hoverDuration)).toBe(1);
    expect(hoverLevel(0.4, 0, hoverDuration * 2)).toBe(0);
    for (const ms of [10, 70, 130]) {
      expect(hoverLevel(0, 1, ms)).toBeGreaterThan(0);
      expect(hoverLevel(0, 1, ms)).toBeLessThan(1);
    }
    for (const id of posedObjects)
      expect(hoverLift[id]).toBeLessThanOrEqual(0.004);
  });
  it("spreads two rings, the second just behind the first", () => {
    const outer = rippleRing(0.5, 0);
    const inner = rippleRing(0.5, 1);
    expect(outer.radius).toBeGreaterThan(inner.radius);
    expect(outer.opacity).toBeLessThan(inner.opacity);
    expect(rippleRing(0.05, 1).opacity).toBe(0);
    for (const p of [0.2, 0.6, 0.95]) {
      expect(rippleRing(p, 0).radius).toBeLessThanOrEqual(1);
      expect(rippleRing(p, 0).opacity).toBeLessThanOrEqual(0.55);
    }
  });
  it("teases only after a quiet spell, spaced apart, a few per visit", () => {
    const base = { now: 20000, lastInput: 0, lastTease: -Infinity, shown: 0 };
    expect(teaseDue(base)).toBe(true);
    expect(teaseDue({ ...base, lastInput: 17000 })).toBe(false);
    expect(teaseDue({ ...base, lastTease: 15000 })).toBe(false);
    expect(teaseDue({ ...base, lastTease: 12000 })).toBe(true);
    expect(teaseDue({ ...base, shown: teaseRules.perVisit })).toBe(false);
    expect(teaseRules).toEqual({ quiet: 4000, gap: 8000, perVisit: 3 });
    expect(pickTease([])).toBeUndefined();
    expect(pickTease(["lamp", "dial"], () => 0)).toBe("lamp");
    expect(pickTease(["lamp", "dial"], () => 0.9999)).toBe("dial");
  });
});

describe("cursor over desk objects", () => {
  it("opens the ring where the desk marks a hovered object", () => {
    const element = (marked: boolean) =>
      ({
        closest: (selector: string) =>
          marked && selector.includes("[data-desk-hover]") ? {} : null,
      }) as unknown as Element;
    expect(cursorLook(element(true))).toBe("action");
    expect(cursorLook(element(false))).toBe("default");
  });
});
