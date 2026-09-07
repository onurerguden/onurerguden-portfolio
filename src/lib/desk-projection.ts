import { Matrix4, Vector3, type Camera } from "three";

type Screen = {
  position: number[];
  normal: number[];
  up: number[];
  width: number;
  height: number;
};

export function createScreenProjection(screen: Screen) {
  const up = new Vector3(...screen.up),
    normal = new Vector3(...screen.normal);
  const right = new Vector3().crossVectors(up, normal).normalize();
  const origin = new Vector3(...screen.position)
    .addScaledVector(right, -screen.width / 2)
    .addScaledVector(up, screen.height / 2);
  const scale = screen.width / 1000;
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
