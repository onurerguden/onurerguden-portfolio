import { describe, expect, it } from "vitest";
import {
  BackSide,
  BoxGeometry,
  DoubleSide,
  FrontSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  TorusKnotGeometry,
  Vector3,
  type Intersection,
  type Side,
} from "three";
import { createOccluders } from "../src/lib/ray-occluders";
import { seededRandom } from "../src/lib/random";

function scene(side: Side) {
  const knot = new Mesh(
    new TorusKnotGeometry(0.4, 0.12, 120, 16),
    new MeshBasicMaterial({ side }),
  );
  knot.position.set(0.1, 0, -0.2);
  knot.rotation.set(0.3, 0.8, 0);
  // Non-indexed, scaled and moved, like a batch placed in the desk.
  const slab = new Mesh(
    new BoxGeometry(1.6, 0.05, 0.8).toNonIndexed(),
    new MeshBasicMaterial({ side }),
  );
  slab.position.set(0, -0.5, 0);
  slab.scale.set(1, 2, 1.5);
  for (const mesh of [knot, slab]) mesh.updateMatrixWorld(true);
  return [knot, slab];
}

describe("ray occluders", () => {
  it("find exactly what a full raycast finds before a distance", () => {
    const random = seededRandom(3);
    const raycaster = new Raycaster();
    for (const side of [DoubleSide, FrontSide, BackSide]) {
      const meshes = scene(side);
      const occluders = createOccluders(meshes);
      let blocked = 0;
      for (let i = 0; i < 400; i++) {
        const origin = new Vector3(
          (random() - 0.5) * 4,
          (random() - 0.5) * 4,
          2 + random(),
        );
        const target = new Vector3(
          (random() - 0.5) * 1.4,
          (random() - 0.5) * 1.2,
          (random() - 0.5) * 0.8,
        );
        raycaster.set(origin, target.sub(origin).normalize());
        const hits: Intersection[] = [];
        for (const mesh of meshes) mesh.raycast(raycaster, hits);
        const distance = 1 + random() * 3;
        const expected = hits.some((hit) => hit.distance < distance);
        if (expected) blocked++;
        expect(occluders.occludes(raycaster.ray, distance), `ray ${i}`).toBe(
          expected,
        );
      }
      // The rays exercise both answers.
      expect(blocked).toBeGreaterThan(40);
      expect(blocked).toBeLessThan(360);
    }
  });
});
