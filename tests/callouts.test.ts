import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { cameraAnchors } from "../src/lib/desk-story/anchors";
import {
  calloutWorld,
  deskCorners,
  drawArrow,
  inset,
  layoutCallouts,
  type CalloutTarget,
  type Projected,
} from "../src/lib/desk-story/callouts";

/** Where the final view's camera (at rest) puts the targets. */
function project(width: number, height: number): Projected {
  const room = cameraAnchors(width, height).room;
  const camera = new PerspectiveCamera(room.fov, width / height, 0.01, 30);
  camera.position.copy(room.position);
  camera.lookAt(room.target);
  camera.updateMatrixWorld();
  const toScreen = ([x, y, z]: [number, number, number]) => {
    const p = new Vector3(x, y, z).project(camera);
    return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height };
  };
  const corners = deskCorners.map(toScreen);
  const at = {
    deskLeft: Math.min(...corners.map((p) => p.x)),
    deskRight: Math.max(...corners.map((p) => p.x)),
  } as Projected;
  for (const id of Object.keys(calloutWorld) as CalloutTarget[])
    at[id] = toScreen(calloutWorld[id]);
  return at;
}

const wide = [
  [1440, 900],
  [1536, 730],
  [1920, 1080],
  [2400, 1000],
  [1280, 720],
] as const;

describe("final view callout layout", () => {
  it.each(wide)("uses the margins beside the desk at %i × %i", (w, h) => {
    const at = project(w, h);
    const layout = layoutCallouts(w, h, at);
    expect(layout.mode).toBe("side");
    expect(layout.arrows.map((a) => a.id)).toEqual([
      "tablet",
      "lamp",
      "drawers",
    ]);
    // The title sits in the right margin, clear of the desk and the curtain.
    const title = layout.title!;
    expect(title.x - title.width / 2).toBeGreaterThan(at.deskRight);
    expect(title.x + title.width / 2).toBeLessThanOrEqual(w * (1 - inset));
    for (const arrow of layout.arrows) {
      const { box } = arrow;
      expect(box.x, arrow.id).toBeGreaterThanOrEqual(0);
      expect(box.y, arrow.id).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, arrow.id).toBeLessThanOrEqual(w);
      expect(box.y + box.height, arrow.id).toBeLessThanOrEqual(h);
      // It points at its object and stops just short of it.
      const tip = { x: box.x + arrow.tip.x, y: box.y + arrow.tip.y };
      const gap = Math.hypot(tip.x - at[arrow.id].x, tip.y - at[arrow.id].y);
      expect(gap, arrow.id).toBeGreaterThan(8);
      expect(gap, arrow.id).toBeLessThan(16);
    }
    // Tails start in the margins: the tablet's on the left, the others right.
    const tail = (id: CalloutTarget) => {
      const arrow = layout.arrows.find((a) => a.id === id)!;
      return arrow.box.x + arrow.tail.x;
    };
    expect(tail("tablet")).toBeLessThan(at.deskLeft);
    expect(tail("lamp")).toBeGreaterThan(at.deskRight);
    expect(tail("drawers")).toBeGreaterThan(at.deskRight);
  });

  it("puts the note above the desk when the margins are narrow", () => {
    const [w, h] = [900, 1200];
    const layout = layoutCallouts(w, h, project(w, h));
    expect(layout.mode).toBe("compact");
    expect(layout.arrows.map((a) => a.id)).toEqual(["lamp"]);
  });

  it("leaves tiny stages alone", () => {
    expect(layoutCallouts(500, 400, project(500, 400)).mode).toBe("none");
  });

  it("draws the same arrow every time", () => {
    const a = drawArrow("lamp", { x: 0, y: 0 }, { x: 300, y: 200 }, 0.2);
    const b = drawArrow("lamp", { x: 0, y: 0 }, { x: 300, y: 200 }, 0.2);
    expect(a).toEqual(b);
    expect(a.path).toMatch(/^M[\d. ]+C/);
    expect(a.burst.match(/M/g)).toHaveLength(3);
  });
});
