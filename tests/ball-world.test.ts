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

  it("follows the original grab offset smoothly and stays awake while held", () => {
    const w = createBallWorld({
      width: 800,
      height: 600,
      radii: [30],
      gravity: 0,
    });
    w.px[0] = 200;
    w.py[0] = 300;
    w.awake[0] = 0;
    expect(w.beginDrag(0, 210, 300)).toBe(true);
    w.moveDrag(400, 300);
    w.advance(1 / 60);
    expect(w.px[0]).toBeGreaterThan(200);
    expect(w.px[0]).toBeLessThan(210);
    run(w, 8);
    expect(w.px[0]).toBeCloseTo(390, 0);
    expect(w.py[0]).toBeCloseTo(300, 0);
    expect(w.settled()).toBe(false);
    expect(w.draggedIndex).toBe(0);
  });

  it("gently displaces sleeping neighbours instead of passing through them", () => {
    const w = createBallWorld({
      width: 800,
      height: 600,
      radii: [30, 30],
      gravity: 0,
    });
    w.setFloor({ x0: 0, dx: 800, ys: [300, 300] });
    w.px.set([200, 264]);
    w.py.fill(270);
    w.awake.fill(0);
    w.beginDrag(0, 200, 270);
    w.awake[1] = 0;
    w.moveDrag(280, 270);
    run(w, 1);
    expect(w.px[1]).toBeGreaterThan(290);
    expect(Math.hypot(w.px[1] - w.px[0], w.py[1] - w.py[0])).toBeGreaterThan(
      59,
    );
    w.endDrag();
    expect(w.draggedIndex).toBe(-1);
    expect(Math.hypot(w.vx[0], w.vy[0])).toBeLessThanOrEqual(180);
  });

  it("bounds an off-screen grab, rejects invalid input and cancels without a throw", () => {
    const w = createBallWorld({
      width: 800,
      height: 600,
      radii: [30],
      gravity: 0,
    });
    w.setWalls({ top: true });
    w.px[0] = 400;
    w.py[0] = 300;
    expect(w.beginDrag(-1, 0, 0)).toBe(false);
    expect(w.beginDrag(1, 0, 0)).toBe(false);
    expect(w.beginDrag(0, NaN, 0)).toBe(false);
    w.beginDrag(0, 400, 300);
    w.moveDrag(10000, -10000);
    run(w, 2);
    expect(w.px[0]).toBeLessThanOrEqual(770);
    expect(w.py[0]).toBeGreaterThanOrEqual(30);
    w.moveDrag(NaN, Infinity);
    w.advance(1 / 60);
    expect(Number.isFinite(w.px[0]) && Number.isFinite(w.py[0])).toBe(true);
    w.endDrag(true);
    expect(w.vx[0]).toBe(0);
    expect(w.vy[0]).toBe(0);
    expect(w.draggedIndex).toBe(-1);
  });

  it("settles again after a drag and clears grabs on reset or resize", () => {
    const w = world();
    run(w, 8);
    w.beginDrag(0, w.px[0], w.py[0]);
    w.moveDrag(w.px[0] + 120, w.py[0] - 60);
    run(w, 1);
    w.endDrag();
    expect(run(w, 10)).toBeLessThan(8);
    expect(w.settled()).toBe(true);
    w.beginDrag(0, w.px[0], w.py[0]);
    w.resize(800, 600);
    expect(w.draggedIndex).toBe(-1);
    w.beginDrag(0, w.px[0], w.py[0]);
    w.spawnAbove();
    expect(w.draggedIndex).toBe(-1);
  });

  it("moves a chosen ball with a gentle directional nudge and stops rendering", () => {
    const w = createBallWorld({ width: W, height: H, radii: [40] });
    w.setFloor({ x0: 0, dx: W, ys: [800, 800] });
    w.px[0] = 720;
    run(w, 3);
    const before = w.px[0];
    expect(w.nudge(0, -1)).toBe(true);
    run(w, 8);
    expect(w.px[0]).toBeLessThan(before - 10);
    expect(w.settled()).toBe(true);
    expect(w.nudge(1, 1)).toBe(false);
  });

  it("is drawn between steps, so every frame moves at any display rate", () => {
    for (const hz of [60, 120, 144]) {
      const w = createBallWorld({ width: W, height: H, radii: [40] });
      w.spawnAbove();
      const drawn = () => w.previousY[0] + (w.py[0] - w.previousY[0]) * w.alpha;
      // Drawing trails the physics by under a step, so the first frame
      // can still show the spawn.
      w.advance(1 / hz);
      let last = drawn();
      let stalled = 0;
      for (let frame = 0; frame < hz / 4; frame++) {
        const before = w.py[0];
        const { steps } = w.advance(1 / hz);
        if (steps === 0) {
          stalled++;
          expect(w.py[0]).toBe(before);
        }
        expect(w.alpha).toBeGreaterThanOrEqual(0);
        expect(w.alpha).toBeLessThan(1);
        // A falling ball is drawn lower on every frame, stepped or not.
        const y = drawn();
        expect(y, `${hz} Hz frame ${frame}`).toBeGreaterThan(last);
        last = y;
      }
      // At 144 Hz the physics alone would hold the ball still now and then.
      if (hz === 144) expect(stalled).toBeGreaterThan(0);
    }
  });

  it("draws a jump where it lands, not on the way there", () => {
    const w = world();
    run(w, 1);
    w.advance(1 / 144);
    w.resize(390, 844);
    expect([...w.previousX]).toEqual([...w.px]);
    expect([...w.previousY]).toEqual([...w.py]);
    w.advance(1 / 144);
    w.spawnAbove();
    expect([...w.previousY]).toEqual([...w.py]);
    expect([...w.previousQ]).toEqual([...w.q]);
  });
});
