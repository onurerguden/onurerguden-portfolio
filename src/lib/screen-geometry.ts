/* Plain CSS-matrix geometry for projected panels; no three.js, so the page
   can use it before the 3D scene loads. */

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
