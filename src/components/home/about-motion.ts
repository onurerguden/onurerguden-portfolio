/**
 * Rotation for the About objects, apart from three.js so it can be tested.
 * Objects with a face (labels, glyphs, logos) return to their rest pose on a
 * spring and never turn more than a bounded angle; round or symmetric ones
 * may spin freely and slow down.
 */
export type Turn = { x: number; y: number; z: number };

/**
 * Each object's resting pose: its face toward the viewer in a slight
 * three-quarter view, turned toward the copy so labels read the right way.
 */
export const restPose: Record<string, [number, number, number]> = {
  basketball: [0, 0, 0],
  tennis: [0.3, 0.4, 0],
  racket: [0.1, 0.35, -0.5],
  terminal: [0.06, 0.34, -0.04],
  braces: [0.08, 0.3, 0.04],
  chip: [0.16, -0.3, 0.06],
  network: [0.1, 0.32, 0],
  keycaps: [0.28, -0.26, 0.04],
  "logo-0": [0.08, -0.32, 0],
  "logo-1": [0.08, 0.3, 0],
  "logo-2": [0.08, -0.28, 0],
};
/** Objects without a readable face; they may spin all the way round. */
export const freeSpin = new Set(["basketball", "tennis", "network"]);
/** How far a faced object may turn from its rest pose, radians. */
export const faceLimit = { yaw: 0.52, pitch: 0.26 };
// Return spring for faced objects: stiffness and 80% of critical damping.
const spring = { stiffness: 14, damping: 2 * Math.sqrt(14) * 0.8 };
/** Largest sway around the rest pose, radians (about ±18° of yaw). */
export const swayAmplitude = { pitch: 0.18, yaw: 0.32, roll: 0.06 };

/**
 * A click turns an object away from the pointer: hit its left side and it
 * turns right, hit its top and it tips back. `dx`, `dy` are the object's
 * offset from the click in px, `reach` the distance that still counts.
 */
export function kick(spin: Turn, dx: number, dy: number, reach: number) {
  if (Math.hypot(dx, dy) >= reach) return;
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  spin.y += 2 * clamp(dx / reach) + 0.4;
  spin.x += 1.4 * clamp(-dy / reach);
}

/** Advances an object's turn (`angle`) and its angular velocity (`spin`). */
export function turn(id: string, angle: Turn, spin: Turn, dt: number) {
  if (freeSpin.has(id)) {
    // Free spin slows down and stays wherever it stops.
    angle.x += spin.x * dt;
    angle.y += spin.y * dt;
    angle.z += spin.z * dt;
    const decay = 1 - Math.min(1, 1.2 * dt);
    spin.x *= decay;
    spin.y *= decay;
    spin.z *= decay;
    return;
  }
  spin.x += (-spring.stiffness * angle.x - spring.damping * spin.x) * dt;
  spin.y += (-spring.stiffness * angle.y - spring.damping * spin.y) * dt;
  angle.x += spin.x * dt;
  angle.y += spin.y * dt;
  angle.z = 0;
  if (Math.abs(angle.y) > faceLimit.yaw) {
    angle.y = Math.sign(angle.y) * faceLimit.yaw;
    spin.y = 0;
  }
  if (Math.abs(angle.x) > faceLimit.pitch) {
    angle.x = Math.sign(angle.x) * faceLimit.pitch;
    spin.x = 0;
  }
}
