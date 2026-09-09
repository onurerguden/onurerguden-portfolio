import { Vector3 } from "three";

type Screen = {
  position: number[];
  normal: number[];
  up: number[];
  width: number;
  height: number;
};

// Project physical frame triangles onto the screen along the camera rays.
// SVG's black union masks overlapping triangles without even/odd pinholes.
export function createScreenOcclusion(screen: Screen, triangles: number[][][]) {
  const origin = new Vector3(...screen.position);
  const normal = new Vector3(...screen.normal);
  const up = new Vector3(...screen.up);
  const right = new Vector3().crossVectors(up, normal).normalize();
  const width = 1000,
    height = (width * screen.height) / screen.width;
  const scale = width / screen.width;
  const clipped: Vector3[][] = [];
  for (const triangle of triangles) {
    const input = triangle.map((p) => new Vector3(...p));
    const output: Vector3[] = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i],
        b = input[(i + 1) % input.length];
      const da = a.clone().sub(origin).dot(normal) - 0.0001;
      const db = b.clone().sub(origin).dot(normal) - 0.0001;
      if (da >= 0) output.push(a);
      if (da >= 0 !== db >= 0) output.push(a.clone().lerp(b, da / (da - db)));
    }
    if (output.length >= 3) clipped.push(output);
  }
  const ray = new Vector3(),
    hit = new Vector3();
  const previousCamera = new Vector3(Infinity, Infinity, Infinity);
  let previousPath = "";
  return (camera: Vector3) => {
    if (camera.equals(previousCamera)) return previousPath;
    previousCamera.copy(camera);
    const distance = camera.clone().sub(origin).dot(normal);
    if (distance <= 0) return (previousPath = "");
    let path = "";
    for (const polygon of clipped) {
      const points: [number, number][] = [];
      for (const point of polygon) {
        ray.copy(point).sub(camera);
        const denominator = ray.dot(normal);
        if (denominator >= -0.00001) break;
        const t = -distance / denominator;
        if (t < 1) break; // Frame behind camera or behind the physical screen.
        hit.copy(camera).addScaledVector(ray, t).sub(origin);
        points.push([
          500 + hit.dot(right) * scale,
          height / 2 - hit.dot(up) * scale,
        ]);
      }
      if (
        points.length !== polygon.length ||
        points.every((p) => p[0] < 0) ||
        points.every((p) => p[0] > width) ||
        points.every((p) => p[1] < 0) ||
        points.every((p) => p[1] > height)
      )
        continue;
      // Front and back faces must share winding so their mask areas form a union.
      const area = points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0);
      if (area < 0) points.reverse();
      path += `M${points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join("L")}Z`;
    }
    return (previousPath = path);
  };
}

export function screenMaskImage(path: string, height: number) {
  if (!path) return "none";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}"><defs><mask id="m"><rect width="1000" height="${height}" fill="white"/><path d="${path}" fill="black"/></mask></defs><rect width="1000" height="${height}" fill="white" mask="url(#m)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
