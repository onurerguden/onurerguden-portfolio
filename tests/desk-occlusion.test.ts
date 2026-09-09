import { describe, it, expect } from "vitest";
import { Vector3 } from "three";
import { createScreenOcclusion } from "../src/lib/desk-occlusion";
const screen = {
  position: [0, 0, 0],
  normal: [0, 0, 1],
  up: [0, 1, 0],
  width: 1,
  height: 1,
};
const triangle = (z: number) => [
  [-0.1, -0.1, z],
  [0.1, -0.1, z],
  [0, 0.1, z],
];
describe("screen frame occlusion", () => {
  it("masks a frame between the camera and screen", () => {
    expect(
      createScreenOcclusion(screen, [triangle(0.5)])(new Vector3(0, 0, 1)),
    ).toContain("300.00,700.00");
  });
  it("does not mask frame geometry behind the display or camera", () => {
    expect(
      createScreenOcclusion(screen, [triangle(-0.1), triangle(2)])(
        new Vector3(0, 0, 1),
      ),
    ).toBe("");
  });
  it("clips frame triangles crossing the screen plane without infinities", () => {
    const path = createScreenOcclusion(screen, [
      [
        [-0.1, -0.1, -0.2],
        [0.1, -0.1, 0.2],
        [0, 0.1, 0.2],
      ],
    ])(new Vector3(0, 0, 1));
    expect(path).toMatch(/^M/);
    expect(path).not.toMatch(/NaN|Infinity/);
  });
});
