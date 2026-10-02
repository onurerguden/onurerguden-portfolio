import { describe, it, expect } from "vitest";
import { PerspectiveCamera } from "three";
import contract from "../src/lib/desk-scene.json";
import {
  createScreenProjection,
  projectScreen,
} from "../src/lib/desk-projection";
import {
  projectPoint,
  quadRect,
  unprojectPoint,
} from "../src/lib/screen-geometry";
import { cameraAnchors } from "../src/lib/desk-story/anchors";

function projected(
  screen: keyof typeof contract.screens,
  stop: "macbook" | "room",
) {
  const camera = new PerspectiveCamera(43, 1440 / 900, 0.01, 30);
  const anchor = cameraAnchors(1440, 900)[stop];
  camera.position.copy(anchor.position);
  camera.lookAt(anchor.target);
  camera.updateMatrixWorld();
  const projection = createScreenProjection(contract.screens[screen], 1280);
  return projectScreen(projection, camera, 1440, 900)!.slice();
}

describe("screen projection", () => {
  it("unprojects a viewport point back to the panel point under it", () => {
    // The tilted MacBook from its close-up and, more oblique, the room.
    for (const stop of ["macbook", "room"] as const) {
      const matrix = projected("MacBookScreen", stop);
      for (const [x, y] of [
        [0, 0],
        [640, 416],
        [1280, 833],
        [200, 700],
      ]) {
        const point = projectPoint(matrix, x, y);
        const back = unprojectPoint(matrix, point.x, point.y)!;
        expect(Math.abs(back.x - x)).toBeLessThan(0.5);
        expect(Math.abs(back.y - y)).toBeLessThan(0.5);
      }
    }
  });

  it("bounds a projected rectangle", () => {
    const matrix = projected("MacBookScreen", "macbook");
    const box = quadRect(matrix, 0, 0, 1280, 1280 * (0.194 / 0.298));
    // The close-up centres the screen and fills 1/1.16 of the width or
    // 1/1.3 of the height.
    expect(box.x + box.width / 2).toBeCloseTo(720, 0);
    expect(box.y + box.height / 2).toBeCloseTo(450, 0);
    expect(box.height).toBeCloseTo(900 / 1.3, 0);
  });
});
