import { describe, it, expect } from "vitest";
import { createBallWorld } from "../src/lib/physics/ball-world";
import { floorInStage } from "../src/lib/bliss-geometry";

const W = 1440;
const H = 900;
const radii = Array.from({ length: 27 }, (_, i) => 38 + (i % 3) * 3);

function world(seed = 7) {
  const w = createBallWorld({ width: W, height: H, radii, seed });
  w.setFloor(floorInStage(W, H));
  w.spawnAbove();
  return w;
}
function run(w: ReturnType<typeof world>, seconds: number, fps = 60) {
  let settledAt = -1;
  for (let frame = 0; frame < seconds * fps; frame++) {
    if (w.advance(1 / fps).settled && settledAt < 0) settledAt = frame / fps;
  }
  return settledAt;
}
function floorY(x: number) {
  const floor = floorInStage(W, H);
  const k = Math.max(
    0,
    Math.min(floor.ys.length - 2, Math.floor((x - floor.x0) / floor.dx)),
  );
  const t = (x - floor.x0 - k * floor.dx) / floor.dx;
  return floor.ys[k] + (floor.ys[k + 1] - floor.ys[k]) * t;
}

describe("tech-stack ball physics", () => {
  it("is deterministic for a seed", () => {
    const a = world(11);
    const b = world(11);
    run(a, 3);
    run(b, 3);
    expect([...a.px]).toEqual([...b.px]);
    expect([...a.py]).toEqual([...b.py]);
  });

  it("drops onto the hill, settles and stops within eight seconds", () => {
    for (const seed of [7, 11, 42]) {
      const w = world(seed);
      const settledAt = run(w, 10);
      expect(settledAt, `seed ${seed}`).toBeGreaterThan(0);
      expect(settledAt, `seed ${seed}`).toBeLessThan(8);
      let overlap = 0;
      for (let i = 0; i < w.count; i++)
        for (let j = i + 1; j < w.count; j++)
          overlap = Math.max(
            overlap,
            radii[i] +
              radii[j] -
              Math.hypot(w.px[i] - w.px[j], w.py[i] - w.py[j]),
          );
      expect(overlap, `seed ${seed}`).toBeLessThan(1.5);
    }
  });

  it("keeps every ball on or above the crest", () => {
    const w = world();
    run(w, 6);
    for (let i = 0; i < w.count; i++)
      expect(w.py[i] + radii[i] - floorY(w.px[i])).toBeLessThan(1);
  });

  it("does not depend much on the display frame rate", () => {
    const a = world(5);
    const b = world(5);
    run(a, 6, 60);
    run(b, 6, 30);
    const meanY = (w: ReturnType<typeof world>) =>
      [...w.py].reduce((sum, y) => sum + y, 0) / w.count;
    expect(Math.abs(meanY(a) - meanY(b))).toBeLessThan(25);
  });

  it("launches the pile against the top edge within a second", () => {
    const w = world();
    run(w, 6);
    w.setWalls({ top: true });
    w.setGravity(-0.55 * 2600);
    w.impulse(0, -1400, 600);
    run(w, 1);
    const ys = [...w.py];
    // About 17 balls fit in a row, so the pile stacks two or three deep.
    expect(ys.reduce((sum, y) => sum + y, 0) / ys.length).toBeLessThan(
      H * 0.25,
    );
    for (let i = 0; i < w.count; i++) {
      expect(w.py[i]).toBeLessThan(H * 0.45);
      expect(w.py[i]).toBeGreaterThanOrEqual(radii[i] - 1);
    }
  });

  it("lets a moving pointer push and wake resting balls", () => {
    const w = world();
    run(w, 8);
    const target = 3;
    const before = w.px[target];
    w.setPointer({
      x: w.px[target] - 50,
      y: w.py[target],
      vx: 900,
      vy: 0,
      r: 60,
    });
    w.advance(1 / 60);
    w.setPointer(null);
    expect(w.awake[target]).toBe(1);
    run(w, 0.3);
    expect(w.px[target]).toBeGreaterThan(before + 5);
  });

  it("rolls balls instead of sliding them", () => {
    const w = createBallWorld({ width: W, height: H, radii: [40], seed: 1 });
    w.setFloor({ x0: 0, dx: W, ys: [800, 800] });
    w.impulse(600, 0, 0, 0);
    const [x, y, z, s] = w.q;
    run(w, 0.4);
    const turned =
      Math.abs(w.q[0] - x) +
      Math.abs(w.q[1] - y) +
      Math.abs(w.q[2] - z) +
      Math.abs(w.q[3] - s);
    expect(turned).toBeGreaterThan(0.2);
  });

  it("turns every resting logo back towards the viewer", () => {
    const w = world(3);
    run(w, 9);
    for (let i = 0; i < w.count; i++) {
      const [x, y] = [w.q[i * 4], w.q[i * 4 + 1]];
      // cos of the angle between the ball's logo axis and ±z.
      const facing = Math.abs(1 - 2 * (x * x + y * y));
      expect(facing, `ball ${i}`).toBeGreaterThan(
        Math.cos((25 * Math.PI) / 180),
      );
    }
  });

  it("survives resizing without losing balls", () => {
    const w = world();
    run(w, 2);
    w.resize(390, 844);
    w.setFloor(floorInStage(390, 844));
    run(w, 3);
    for (let i = 0; i < w.count; i++) {
      expect(Number.isFinite(w.px[i]) && Number.isFinite(w.py[i])).toBe(true);
      expect(w.px[i]).toBeGreaterThanOrEqual(0);
      expect(w.px[i]).toBeLessThanOrEqual(390);
    }
  });
});
