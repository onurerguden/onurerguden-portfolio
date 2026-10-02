import { Matrix4, Vector3, type Camera } from "three";

type Screen = {
  position: number[];
  normal: number[];
  up: number[];
  width: number;
  height: number;
};

export function createScreenProjection(screen: Screen, pixelWidth = 1000) {
  const up = new Vector3(...screen.up),
    normal = new Vector3(...screen.normal);
  const right = new Vector3().crossVectors(up, normal).normalize();
  const origin = new Vector3(...screen.position)
    .addScaledVector(right, -screen.width / 2)
    .addScaledVector(up, screen.height / 2);
  const scale = screen.width / pixelWidth;
  return {
    model: new Matrix4().set(
      right.x * scale,
      -up.x * scale,
      0,
      origin.x,
      right.y * scale,
      -up.y * scale,
      0,
      origin.y,
      right.z * scale,
      -up.z * scale,
      0,
      origin.z,
      0,
      0,
      0,
      1,
    ),
    clip: new Matrix4(),
    css: new Array<number>(16).fill(0),
  };
}

// Project an HTML rectangle to the same pixels as its 3D screen. Buffer reuse
// keeps this out of React state and avoids allocating matrices on every frame.
export function projectScreen(
  projection: ReturnType<typeof createScreenProjection>,
  camera: Camera,
  width: number,
  height: number,
) {
  const { model, clip, css } = projection;
  clip
    .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    .multiply(model);
  const e = clip.elements;
  for (let column = 0; column < 4; column++) {
    const k = column * 4;
    css[k] = ((e[k] + e[k + 3]) * width) / 2;
    css[k + 1] = ((e[k + 3] - e[k + 1]) * height) / 2;
    css[k + 2] = 0;
    css[k + 3] = e[k + 3];
  }
  css[10] = 1; // Invertible CSS transform; input z is always zero.
  const divisor = css[15];
  if (divisor <= 0) return null;
  for (let i = 0; i < 16; i++) css[i] /= divisor;
  return css;
}

/**
 * The inverse of a CSS transform on a flat element: the element-local point
 * under a point of its parent, both in CSS px. For a `matrix3d` with z = 0
 * the transform is a 2D homography, so one 3×3 inverse undoes it, perspective
 * included. `m` is column-major, as in `matrix3d()` or `DOMMatrix`.
 */
export function unprojectPoint(m: ArrayLike<number>, x: number, y: number) {
  // Rows of the homography taking (u, v, 1) to (X, Y, W).
  const a = m[0],
    b = m[4],
    c = m[12];
  const d = m[1],
    e = m[5],
    f = m[13];
  const g = m[3],
    h = m[7],
    i = m[15];
  // Adjugate times (x, y, 1); the determinant cancels in the division.
  const u = (e * i - f * h) * x + (c * h - b * i) * y + (b * f - c * e);
  const v = (f * g - d * i) * x + (a * i - c * g) * y + (c * d - a * f);
  const w = (d * h - e * g) * x + (b * g - a * h) * y + (a * e - b * d);
  if (Math.abs(w) < 1e-9) return null;
  return { x: u / w, y: v / w };
}

/** Where an element-local point lands in its parent under `m`. */
export function projectPoint(m: ArrayLike<number>, x: number, y: number) {
  const w = m[3] * x + m[7] * y + m[15];
  return {
    x: (m[0] * x + m[4] * y + m[12]) / w,
    y: (m[1] * x + m[5] * y + m[13]) / w,
  };
}

/** The axis-aligned box of an element-local rectangle under `m`. */
export function quadRect(
  m: ArrayLike<number>,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  const corners = [
    projectPoint(m, left, top),
    projectPoint(m, left + width, top),
    projectPoint(m, left, top + height),
    projectPoint(m, left + width, top + height),
  ];
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
