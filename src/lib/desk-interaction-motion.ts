export type AnimatedObject = "headphones" | "mouse" | "tablet";
export const lampColors = [
  "#694b2f",
  "#603f4b",
  "#514366",
  "#35546b",
  "#405e4e",
] as const;
export const animationDuration = { headphones: 550, mouse: 750, tablet: 1000 };
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Absolute offsets from the authored pose; never accumulate transform drift. */
export function accessoryPose(
  id: AnimatedObject,
  progress: number,
  variant = 0,
) {
  const t = Math.max(0, Math.min(1, progress));
  const pose = { x: 0, y: 0, z: 0, rotation: 0 };
  if (t === 0 || t === 1) return pose;
  const pulse = Math.sin(Math.PI * t) ** 2;
  if (id === "headphones") {
    pose.y = 0.012 * pulse;
    pose.rotation = 0.045 * Math.sin(t * Math.PI * 4) * pulse;
  } else if (id === "mouse") {
    if (variant === 4) {
      pose.x = 0.01 * (1 - Math.cos(2 * Math.PI * smooth(t)));
      pose.z = 0.01 * Math.sin(2 * Math.PI * smooth(t));
    } else {
      const direction = [
        [1, 0],
        [-1, 0],
        [0, -1],
        [0, 1],
      ][variant % 4];
      pose.x = direction[0] * 0.018 * pulse;
      pose.z = direction[1] * 0.018 * pulse;
    }
    pose.rotation = 0.06 * Math.sin(t * Math.PI * 2) * pulse;
  } else {
    // Pencil starts beside the right tablet edge, away from the laptop rest.
    const excursion =
      t < 0.35 ? smooth(t / 0.35) : t < 0.6 ? 1 : 1 - smooth((t - 0.6) / 0.4);
    pose.x = 0.013 * excursion;
    pose.y = -0.004 * excursion; // 4 mm radius clears the 4 mm desk mat
    pose.rotation = 0.8 * excursion;
  }
  return pose;
}
