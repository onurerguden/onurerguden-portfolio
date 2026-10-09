import {
  BackSide,
  Box3,
  FrontSide,
  Matrix4,
  Ray,
  Vector3,
  type Mesh,
} from "three";

/**
 * Answers "does anything in these meshes lie on the ray before `distance`?"
 * without testing every triangle. The desk's static batches span the whole
 * desk, so a plain raycast tests all of their ~25,000 triangles; here each
 * mesh's triangles are sorted once into a coarse grid of cells, and a ray
 * only tests the triangles of the cells it passes through. Hits match
 * three's own Mesh.raycast (same sides, same world distance).
 */
export type Occluders = {
  occludes(ray: Ray, distance: number): boolean;
};

type Cell = { box: Box3; triangles: Uint32Array };
type Grid = { mesh: Mesh; bounds: Box3; cells: Cell[] };

/** About this many triangles share a cell; a ray crosses a few cells. */
const perCell = 32;

function buildGrid(mesh: Mesh): Grid {
  const { geometry } = mesh;
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = (index ? index.count : position.count) / 3;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!.clone();
  const size = bounds.getSize(new Vector3());
  const n = Math.max(1, Math.min(16, Math.round(Math.cbrt(count / perCell))));
  const vertex = (t: number, k: number) =>
    index ? index.getX(t * 3 + k) : t * 3 + k;
  const cellOf = (t: number) => {
    let x = 0,
      y = 0,
      z = 0;
    for (let k = 0; k < 3; k++) {
      const v = vertex(t, k);
      x += position.getX(v) / 3;
      y += position.getY(v) / 3;
      z += position.getZ(v) / 3;
    }
    const at = (value: number, min: number, extent: number) =>
      extent > 0
        ? Math.min(n - 1, Math.floor(((value - min) / extent) * n))
        : 0;
    return (
      (at(z, bounds.min.z, size.z) * n + at(y, bounds.min.y, size.y)) * n +
      at(x, bounds.min.x, size.x)
    );
  };
  const owners = new Uint32Array(count);
  const sizes = new Uint32Array(n * n * n);
  for (let t = 0; t < count; t++) sizes[(owners[t] = cellOf(t))]++;
  const cells: (Cell | null)[] = Array.from(sizes, (cellSize) =>
    cellSize ? { box: new Box3(), triangles: new Uint32Array(cellSize) } : null,
  );
  const filled = new Uint32Array(n * n * n);
  const point = new Vector3();
  for (let t = 0; t < count; t++) {
    const cell = cells[owners[t]]!;
    cell.triangles[filled[owners[t]]++] = t;
    // Each cell's box holds its triangles whole, not just their centres.
    for (let k = 0; k < 3; k++)
      cell.box.expandByPoint(point.fromBufferAttribute(position, vertex(t, k)));
  }
  return { mesh, bounds, cells: cells.filter((cell) => cell !== null) };
}

export function createOccluders(meshes: readonly Mesh[]): Occluders {
  // Built on the first question, not with the model.
  let grids: Grid[] | null = null;
  const inverse = new Matrix4();
  const local = new Ray();
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3(),
    point = new Vector3();
  return {
    occludes(ray, distance) {
      grids ??= meshes.map(buildGrid);
      for (const { mesh, bounds, cells } of grids) {
        const position = mesh.geometry.getAttribute("position");
        const index = mesh.geometry.getIndex();
        const material = mesh.material;
        // Several materials: count both sides, as the widest of them would.
        const side = Array.isArray(material) ? undefined : material.side;
        inverse.copy(mesh.matrixWorld).invert();
        local.copy(ray).applyMatrix4(inverse);
        if (!local.intersectsBox(bounds)) continue;
        for (const cell of cells) {
          if (!local.intersectsBox(cell.box)) continue;
          const { triangles } = cell;
          for (let j = 0; j < triangles.length; j++) {
            const i = triangles[j] * 3;
            a.fromBufferAttribute(position, index ? index.getX(i) : i);
            b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1);
            c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2);
            const hit =
              side === BackSide
                ? local.intersectTriangle(c, b, a, true, point)
                : local.intersectTriangle(a, b, c, side === FrontSide, point);
            if (
              hit &&
              point.applyMatrix4(mesh.matrixWorld).distanceTo(ray.origin) <
                distance
            )
              return true;
          }
        }
      }
      return false;
    },
  };
}
