import { describe, expect, it } from "vitest";
import {
  faceLimit,
  kick,
  restPose,
  swayAmplitude,
  turn,
} from "../src/components/home/about-motion";

const run = (id: string, clicks: number) => {
  const angle = { x: 0, y: 0, z: 0 };
  const spin = { x: 0, y: 0, z: 0 };
  let largest = 0;
  for (let frame = 0; frame < 60 * 20; frame++) {
    // A click every half second for the first `clicks` half seconds.
    if (frame % 30 === 0 && frame / 30 < clicks) kick(spin, -40, 30, 120);
    turn(id, angle, spin, 1 / 60);
    largest = Math.max(largest, Math.abs(angle.y), Math.abs(angle.x));
  }
  return { angle, largest };
};

describe("About object motion", () => {
  it("never turns a labelled object far enough to read it backwards", () => {
    for (const id of ["chip", "terminal", "keycaps", "braces", "logo-0"]) {
      const { angle, largest } = run(id, 20);
      expect(largest).toBeLessThanOrEqual(faceLimit.yaw);
      // Rest pose, sway and the largest turn together stay short of 90°.
      const [, restY] = restPose[id];
      expect(Math.abs(restY) + swayAmplitude.yaw + faceLimit.yaw).toBeLessThan(
        Math.PI / 2,
      );
      // And the spring brings it back to rest.
      expect(Math.abs(angle.y)).toBeLessThan(0.01);
      expect(Math.abs(angle.x)).toBeLessThan(0.01);
    }
  });
  it("turns away from the pointer and lets round objects spin freely", () => {
    const spin = { x: 0, y: 0, z: 0 };
    // The object sits right of and above the click.
    kick(spin, 40, -30, 120);
    expect(spin.y).toBeGreaterThan(0);
    expect(spin.x).toBeGreaterThan(0);
    const missed = { x: 0, y: 0, z: 0 };
    kick(missed, 200, 0, 120);
    expect(missed).toEqual({ x: 0, y: 0, z: 0 });
    expect(run("basketball", 6).largest).toBeGreaterThan(faceLimit.yaw);
  });
});
