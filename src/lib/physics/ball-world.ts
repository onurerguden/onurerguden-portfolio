/**
 * A tiny deterministic 2D ball simulation for the tech-stack stage.
 *
 * Positions are stage CSS pixels with y pointing down. Rotation is tracked in
 * 3D (a quaternion per ball) so logos on the balls roll and tumble. The floor
 * is a heightfield sampled evenly in x (the hill crest), which is exact for
 * any shape and costs O(1) segment lookups per ball. No three.js import, so
 * the whole thing is unit-testable in Node.
 */
import { seededRandom } from "@/lib/random";

export type Floor = {
  /** x of the first sample, in stage px. */
  x0: number;
  /** Distance between samples, in stage px. */
  dx: number;
  /** Surface y at each sample, in stage px (y down). */
  ys: ArrayLike<number>;
};

export type Walls = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};

export type BallWorldOptions = {
  width: number;
  height: number;
  radii: readonly number[];
  seed?: number;
  /** px/s², positive is down. */
  gravity?: number;
  restitution?: { ball: number; floor: number; wall: number };
  /** Rolling resistance as a fraction of gravity (0.08 holds a 4° slope). */
  rolling?: number;
  /** Fraction of linear velocity lost per second in flight. */
  linearDamping?: number;
  /** Fraction of spin lost per second. */
  angularDamping?: number;
  step?: number;
  maxSubsteps?: number;
};

export type PointerBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

const SLEEP_SPEED = 20;
const SLEEP_SPIN = 0.5;
const SLEEP_TIME = 0.35;
/** Below this approach speed, contacts do not bounce (stops jitter). */
const REST_SPEED = 30;
/** A sleeping ball only wakes for impacts faster than this. */
const WAKE_SPEED = 90;
/** Slow contacts lose this fraction of velocity per second (kills jitter). */
const CONTACT_DAMPING = 9;
const CONTACT_DAMPING_SPEED = 80;
const SOLVER_ITERATIONS = 6;
/** After this long, a pile where every ball is slow is put to sleep. */
const SETTLE_AFTER = 6;
const SETTLE_SPEED = 40;
const DRAG_STIFFNESS = 180;
const DRAG_DAMPING = 26;
const DRAG_SPEED = 700;

export type BallWorld = ReturnType<typeof createBallWorld>;

export function createBallWorld(options: BallWorldOptions) {
  const count = options.radii.length;
  const radii = Float32Array.from(options.radii);
  const mass = radii.map((r) => r * r);
  const px = new Float32Array(count);
  const py = new Float32Array(count);
  const vx = new Float32Array(count);
  const vy = new Float32Array(count);
  // Angular velocity (rad/s) around x, y, z.
  const wx = new Float32Array(count);
  const wy = new Float32Array(count);
  const wz = new Float32Array(count);
  // Orientation quaternion, xyzw.
  const q = new Float32Array(count * 4);
  const awake = new Uint8Array(count).fill(1);
  const restTime = new Float32Array(count);
  const touching = new Uint8Array(count);
  for (let i = 0; i < count; i++) q[i * 4 + 3] = 1;

  const random = seededRandom(options.seed ?? 0x5eed);
  const restitution = options.restitution ?? {
    ball: 0.42,
    floor: 0.34,
    wall: 0.55,
  };
  const rolling = options.rolling ?? 0.08;
  const linearDamping = options.linearDamping ?? 0.12;
  const angularDamping = options.angularDamping ?? 0.9;
  const step = options.step ?? 1 / 120;
  const maxSubsteps = options.maxSubsteps ?? 4;
  let width = options.width;
  let height = options.height;
  let gravity = options.gravity ?? 2600;
  let floor: Floor | null = null;
  let walls: Walls = { left: true, right: true, top: false, bottom: true };
  let pointer: PointerBody | null = null;
  let drag: {
    index: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null = null;
  let accumulator = 0;
  let sinceWake = 0;

  const wake = (i: number) => {
    awake[i] = 1;
    restTime[i] = 0;
  };
  const wakeAll = () => {
    for (let i = 0; i < count; i++) wake(i);
    sinceWake = 0;
  };

  /**
   * Resolves ball i against the deepest crest segment it overlaps. The crest
   * is convex, so one contact per iteration is enough and avoids double pushes.
   */
  function floorContact(i: number) {
    if (!floor) return;
    const { x0, dx, ys } = floor;
    const r = radii[i];
    const last = ys.length - 1;
    const from = Math.max(0, Math.floor((px[i] - r - x0) / dx));
    const to = Math.min(last - 1, Math.ceil((px[i] + r - x0) / dx));
    let depth = 0;
    let normalX = 0;
    let normalY = -1;
    for (let k = from; k <= to; k++) {
      const ax = x0 + k * dx;
      const ay = ys[k];
      const sx = dx;
      const sy = ys[k + 1] - ay;
      const t = Math.min(
        1,
        Math.max(
          0,
          ((px[i] - ax) * sx + (py[i] - ay) * sy) / (sx * sx + sy * sy),
        ),
      );
      let nx = px[i] - (ax + sx * t);
      let ny = py[i] - (ay + sy * t);
      let distance = Math.hypot(nx, ny);
      // A centre below the surface is pushed out along the segment's normal.
      const below = (py[i] - ay) * sx - (px[i] - ax) * sy > 0;
      if (below || distance < 1e-6) {
        const length = Math.hypot(sx, sy);
        nx = sy / length;
        ny = -sx / length;
        distance = -distance;
      } else {
        nx /= distance;
        ny /= distance;
      }
      if (r - distance > depth) {
        depth = r - distance;
        normalX = nx;
        normalY = ny;
      }
    }
    if (depth <= 0) return;
    resolveStatic(i, normalX, normalY, depth, restitution.floor);
    touching[i] = 1;
  }

  /** Pushes ball i out along (nx, ny) and bounces it off a static surface. */
  function resolveStatic(
    i: number,
    nx: number,
    ny: number,
    depth: number,
    bounce: number,
  ) {
    px[i] += nx * depth;
    py[i] += ny * depth;
    const vn = vx[i] * nx + vy[i] * ny;
    if (vn < 0) {
      const e = -vn < REST_SPEED ? 0 : bounce;
      vx[i] -= (1 + e) * vn * nx;
      vy[i] -= (1 + e) * vn * ny;
    }
  }

  function wallContacts(i: number) {
    const r = radii[i];
    if (walls.left && px[i] < r) {
      resolveStatic(i, 1, 0, r - px[i], restitution.wall);
      touching[i] = 1;
    }
    if (walls.right && px[i] > width - r) {
      resolveStatic(i, -1, 0, px[i] - (width - r), restitution.wall);
      touching[i] = 1;
    }
    if (walls.top && py[i] < r) {
      resolveStatic(i, 0, 1, r - py[i], restitution.wall);
    }
    // The bottom wall only catches balls that slip past the floor.
    if (walls.bottom && py[i] > height - r) {
      resolveStatic(i, 0, -1, py[i] - (height - r), restitution.floor);
      touching[i] = 1;
    }
  }

  function ballContacts() {
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (!awake[i] && !awake[j]) continue;
        const dx = px[j] - px[i];
        const dy = py[j] - py[i];
        const reach = radii[i] + radii[j];
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq >= reach * reach) continue;
        const distance = Math.sqrt(distanceSq);
        const nx = distance > 1e-6 ? dx / distance : 1;
        const ny = distance > 1e-6 ? dy / distance : 0;
        const vn = (vx[j] - vx[i]) * nx + (vy[j] - vy[i]) * ny;
        // A sleeping ball supports an awake one like a static surface unless
        // the impact is hard enough to wake it.
        if (!awake[i] || !awake[j]) {
          const sleeper = awake[i] ? j : i;
          if (drag || -vn > WAKE_SPEED) wake(sleeper);
          else {
            const mover = sleeper === i ? j : i;
            const sign = mover === j ? 1 : -1;
            resolveStatic(
              mover,
              nx * sign,
              ny * sign,
              reach - distance,
              restitution.ball,
            );
            if (ny * sign < -0.3) touching[mover] = 1;
            continue;
          }
        }
        const overlap = reach - distance;
        const total = mass[i] + mass[j];
        px[i] -= (nx * overlap * mass[j]) / total;
        py[i] -= (ny * overlap * mass[j]) / total;
        px[j] += (nx * overlap * mass[i]) / total;
        py[j] += (ny * overlap * mass[i]) / total;
        if (vn < 0) {
          const e = -vn < REST_SPEED ? 0 : restitution.ball;
          const impulse = (-(1 + e) * vn) / (1 / mass[i] + 1 / mass[j]);
          vx[i] -= (impulse / mass[i]) * nx;
          vy[i] -= (impulse / mass[i]) * ny;
          vx[j] += (impulse / mass[j]) * nx;
          vy[j] += (impulse / mass[j]) * ny;
        }
        // A ball resting on another counts as supported.
        if (ny > 0.3) touching[j] = 1;
        if (ny < -0.3) touching[i] = 1;
      }
    }
  }

  function pointerContacts() {
    if (!pointer) return;
    for (let i = 0; i < count; i++) {
      const dx = px[i] - pointer.x;
      const dy = py[i] - pointer.y;
      const reach = radii[i] + pointer.r;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq >= reach * reach) continue;
      const distance = Math.sqrt(distanceSq) || 1e-6;
      const nx = dx / distance;
      const ny = dy / distance;
      wake(i);
      px[i] += nx * (reach - distance);
      py[i] += ny * (reach - distance);
      // Relative to the moving pointer, then back.
      const rvx = vx[i] - pointer.vx;
      const rvy = vy[i] - pointer.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        vx[i] -= 1.6 * vn * nx;
        vy[i] -= 1.6 * vn * ny;
      }
    }
  }

  function integrate(dt: number) {
    const linear = Math.max(0, 1 - linearDamping * dt);
    const angular = Math.max(0, 1 - angularDamping * dt);
    for (let i = 0; i < count; i++) {
      if (!awake[i]) continue;
      if (drag?.index === i) {
        // A damped spring follows the grab point without teleporting through
        // neighbours. Gravity is suspended only for the held ball.
        vx[i] +=
          (DRAG_STIFFNESS * (drag.x - px[i]) - DRAG_DAMPING * vx[i]) * dt;
        vy[i] +=
          (DRAG_STIFFNESS * (drag.y - py[i]) - DRAG_DAMPING * vy[i]) * dt;
        const speed = Math.hypot(vx[i], vy[i]);
        if (speed > DRAG_SPEED) {
          vx[i] *= DRAG_SPEED / speed;
          vy[i] *= DRAG_SPEED / speed;
        }
        wz[i] = vx[i] / radii[i];
      } else vy[i] += gravity * dt;
      vx[i] *= linear;
      vy[i] *= linear;
      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;
      touching[i] = 0;
    }
    for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration++) {
      ballContacts();
      pointerContacts();
      for (let i = 0; i < count; i++) {
        if (!awake[i]) continue;
        floorContact(i);
        wallContacts(i);
      }
    }
    for (let i = 0; i < count; i++) {
      if (!awake[i]) continue;
      const speed = Math.hypot(vx[i], vy[i]);
      if (touching[i]) {
        // Rolling resistance and contact damping, then roll around z.
        const drop =
          Math.abs(gravity) * rolling * dt +
          (speed < CONTACT_DAMPING_SPEED ? speed * CONTACT_DAMPING * dt : 0);
        const scale = speed > drop ? (speed - drop) / speed : 0;
        vx[i] *= scale;
        vy[i] *= scale;
        wz[i] = vx[i] / radii[i];
        // Out-of-plane tumble dies quickly on the ground.
        wx[i] *= angular * angular;
        wy[i] *= angular * angular;
        rightUp(i, Math.min(1, 6 * dt));
      } else {
        wx[i] *= angular;
        wy[i] *= angular;
        wz[i] *= angular;
      }
      rotate(i, dt);
      const spin = Math.hypot(wx[i], wy[i], wz[i]);
      if (
        drag?.index !== i &&
        touching[i] &&
        speed < SLEEP_SPEED &&
        spin < SLEEP_SPIN
      ) {
        restTime[i] += dt;
        if (restTime[i] > SLEEP_TIME) {
          awake[i] = 0;
          vx[i] = vy[i] = wx[i] = wy[i] = wz[i] = 0;
        }
      } else restTime[i] = 0;
    }
  }

  /**
   * A resting ball slowly turns its logo axis (local z) back towards the
   * viewer (±z), keeping its spin in the screen plane, so logos stay legible.
   */
  function rightUp(i: number, rate: number) {
    const o = i * 4;
    const x = q[o];
    const y = q[o + 1];
    const z = q[o + 2];
    const w = q[o + 3];
    // Local z axis in world space.
    const ax = 2 * (x * z + w * y);
    const ay = 2 * (y * z - w * x);
    const az = 1 - 2 * (x * x + y * y);
    const target = az >= 0 ? 1 : -1;
    // Axis = a × target·ẑ, angle between them.
    const cx = ay * target;
    const cy = -ax * target;
    const sine = Math.hypot(cx, cy);
    if (sine < 1e-4) return;
    const angle = Math.atan2(sine, az * target) * rate;
    const h = angle / 2;
    const s = Math.sin(h) / sine;
    const rx = cx * s;
    const ry = cy * s;
    const rw = Math.cos(h);
    // q ← r · q (rotate in world space).
    const nx = rw * x + rx * w + ry * z;
    const ny = rw * y - rx * z + ry * w;
    const nz = rw * z + rx * y - ry * x;
    const nw = rw * w - rx * x - ry * y;
    const length = Math.hypot(nx, ny, nz, nw) || 1;
    q[o] = nx / length;
    q[o + 1] = ny / length;
    q[o + 2] = nz / length;
    q[o + 3] = nw / length;
  }

  /** q ← q + ½·ω·q·dt with y flipped so screen-space spin reads naturally. */
  function rotate(i: number, dt: number) {
    const o = i * 4;
    const ax = wx[i];
    const ay = -wy[i];
    const az = -wz[i];
    const x = q[o];
    const y = q[o + 1];
    const z = q[o + 2];
    const w = q[o + 3];
    const h = dt / 2;
    const nx = x + h * (ax * w + ay * z - az * y);
    const ny = y + h * (ay * w + az * x - ax * z);
    const nz = z + h * (az * w + ax * y - ay * x);
    const nw = w - h * (ax * x + ay * y + az * z);
    const length = Math.hypot(nx, ny, nz, nw) || 1;
    q[o] = nx / length;
    q[o + 1] = ny / length;
    q[o + 2] = nz / length;
    q[o + 3] = nw / length;
  }

  function settled() {
    if (drag) return false;
    for (let i = 0; i < count; i++) if (awake[i]) return false;
    return true;
  }

  /** A pile that has been slow for a while stops for good (no endless jitter). */
  function settleSlowPile(dt: number) {
    if (drag) return;
    sinceWake += dt;
    if (sinceWake < SETTLE_AFTER) return;
    for (let i = 0; i < count; i++)
      if (awake[i] && Math.hypot(vx[i], vy[i]) > SETTLE_SPEED) return;
    for (let i = 0; i < count; i++) {
      awake[i] = 0;
      vx[i] = vy[i] = wx[i] = wy[i] = wz[i] = 0;
    }
  }

  return {
    count,
    radii,
    px,
    py,
    vx,
    vy,
    q,
    awake,
    get draggedIndex() {
      return drag?.index ?? -1;
    },
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    setFloor(next: Floor | null) {
      floor = next;
      wakeAll();
    },
    setGravity(next: number) {
      if (next === gravity) return;
      gravity = next;
      wakeAll();
    },
    setWalls(next: Partial<Walls>) {
      walls = { ...walls, ...next };
      wakeAll();
    },
    /** Rescales positions proportionally so a resize keeps the composition. */
    resize(nextWidth: number, nextHeight: number) {
      if (nextWidth <= 0 || nextHeight <= 0) return;
      drag = null;
      const sx = nextWidth / width;
      const sy = nextHeight / height;
      for (let i = 0; i < count; i++) {
        px[i] *= sx;
        py[i] *= sy;
      }
      width = nextWidth;
      height = nextHeight;
      wakeAll();
    },
    /** Places every ball above the stage in a loose, seeded column stack. */
    spawnAbove(spread = 1) {
      drag = null;
      const columns = Math.max(1, Math.floor(width / (radii[0] * 2.6)));
      for (let i = 0; i < count; i++) {
        const column = i % columns;
        const row = Math.floor(i / columns);
        const r = radii[i];
        const cell = width / columns;
        px[i] = Math.min(
          width - r,
          Math.max(r, cell * (column + 0.5) + (random() - 0.5) * cell * 0.5),
        );
        py[i] = -r - row * r * 2.4 * spread - random() * r * 3;
        vx[i] = (random() - 0.5) * 120;
        vy[i] = random() * 120;
        wx[i] = (random() - 0.5) * 4;
        wy[i] = (random() - 0.5) * 4;
        wz[i] = 0;
      }
      accumulator = 0;
      wakeAll();
    },
    /** Adds the same kick to every ball, with seeded spread and tumble. */
    impulse(dvx: number, dvy: number, spreadX = 0, spin = 6) {
      for (let i = 0; i < count; i++) {
        vx[i] += dvx + (random() - 0.5) * spreadX;
        vy[i] += dvy * (0.75 + random() * 0.5);
        wx[i] += (random() - 0.5) * spin;
        wy[i] += (random() - 0.5) * spin;
      }
      wakeAll();
    },
    /** Kicks the ball nearest (x, y) if it is within two radii. */
    kick(x: number, y: number, speed: number) {
      let best = -1;
      let bestDistance = Infinity;
      for (let i = 0; i < count; i++) {
        const distance = Math.hypot(px[i] - x, py[i] - y);
        if (distance < radii[i] * 2 && distance < bestDistance) {
          best = i;
          bestDistance = distance;
        }
      }
      if (best < 0) return -1;
      const angle = -Math.PI / 2 + (random() - 0.5) * 1.2;
      vx[best] += Math.cos(angle) * speed;
      vy[best] += Math.sin(angle) * speed;
      wx[best] += (random() - 0.5) * 10;
      wy[best] += (random() - 0.5) * 10;
      wake(best);
      return best;
    },
    setPointer(next: PointerBody | null) {
      pointer = next;
    },
    /** Keeps the original grab offset, including a grab near a ball's edge. */
    beginDrag(index: number, x: number, y: number) {
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= count ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      )
        return false;
      drag = {
        index,
        x: px[index],
        y: py[index],
        offsetX: px[index] - x,
        offsetY: py[index] - y,
      };
      wakeAll();
      return true;
    },
    moveDrag(x: number, y: number) {
      if (!drag || !Number.isFinite(x) || !Number.isFinite(y)) return;
      const r = radii[drag.index];
      drag.x = Math.max(r, Math.min(width - r, x + drag.offsetX));
      drag.y = Math.max(r, Math.min(height - r, y + drag.offsetY));
    },
    /** A short, bounded coast on release; cancellation adds no throw. */
    endDrag(cancel = false) {
      if (!drag) return;
      const i = drag.index;
      const speed = Math.hypot(vx[i], vy[i]);
      const scale = cancel ? 0 : Math.min(0.25, 180 / (speed || 1));
      vx[i] = cancel ? 0 : vx[i] * scale;
      vy[i] = cancel ? 0 : vy[i] * scale;
      drag = null;
      sinceWake = 0;
      wake(i);
    },
    /** A single-click / keyboard alternative to moving a ball by dragging. */
    nudge(index: number, direction: -1 | 1) {
      if (!Number.isInteger(index) || index < 0 || index >= count) return false;
      drag = null;
      vx[index] = direction * 180;
      wakeAll();
      return true;
    },
    /** Advances by real time with a fixed step; returns steps taken. */
    advance(dt: number) {
      accumulator += Math.min(Math.max(dt, 0), 1 / 30);
      let steps = 0;
      while (accumulator >= step && steps < maxSubsteps) {
        integrate(step);
        accumulator -= step;
        steps++;
      }
      if (steps === maxSubsteps) accumulator = 0;
      settleSlowPile(steps * step);
      return { steps, settled: settled() };
    },
    settled,
  };
}
