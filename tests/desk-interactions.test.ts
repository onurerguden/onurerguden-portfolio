import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { accessoryPose, lampColors } from "../src/lib/desk-interaction-motion";
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
