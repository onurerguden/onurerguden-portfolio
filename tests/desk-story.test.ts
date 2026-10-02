import { describe, it, expect } from "vitest";
import {
  cameraAnchors,
  closeupScale,
  screenStops,
} from "../src/lib/desk-story/camera";
import {
  arrivalDistance,
  buildTimeline,
  holds,
  pageFraction,
  pageOffset,
  readDistance,
  readRange,
  remapDistance,
  roomDistance,
  storyAt,
} from "../src/lib/desk-story/timeline";

const portrait = screenStops.indexOf("portrait");
const macbook = screenStops.indexOf("macbook");

describe("desk story timeline", () => {
  const timeline = buildTimeline({ portrait: 1.7, macbook: 1 });

  it("holds the camera still on the monitor while only its content moves", () => {
    const [start, end] = readRange(timeline, portrait);
    expect(end - start).toBeCloseTo(1.7);
    const camera = (d: number) => {
      const state = storyAt(timeline, d);
      return [state.from, state.to, state.travel];
    };
    for (const fraction of [0, 0.3, 0.7, 1]) {
      const d = start + (end - start) * fraction;
      expect(camera(d)).toEqual(["portrait", "portrait", 0]);
      expect(storyAt(timeline, d).reading[portrait]).toBeCloseTo(fraction);
      expect(storyAt(timeline, d).active).toBe(portrait);
    }
    // The still holds either side of the read.
    expect(start - arrivalDistance(timeline, portrait)).toBeCloseTo(holds.read);
    expect(camera(start - 0.1)).toEqual(["portrait", "portrait", 0]);
    expect(camera(end + 0.1)).toEqual(["portrait", "portrait", 0]);
  });

  it("is a pure function of distance: reversing and clamping change nothing", () => {
    const path = Array.from(
      { length: 60 },
      (_, i) => (i * timeline.length) / 59,
    );
    const forward = path.map((d) => storyAt(timeline, d));
    const backward = [...path].reverse().map((d) => storyAt(timeline, d));
    expect(backward.reverse()).toEqual(forward);
    expect(storyAt(timeline, -5)).toEqual(storyAt(timeline, 0));
    expect(storyAt(timeline, 99)).toEqual(storyAt(timeline, timeline.length));
    expect(storyAt(timeline, 0).from).toBe("opening");
    expect(storyAt(timeline, timeline.length).from).toBe("room");
    expect(timeline.length - roomDistance(timeline)).toBeCloseTo(holds.room);
  });

  it("opens the monitor's window while the camera arrives", () => {
    const arrive = arrivalDistance(timeline, portrait);
    expect(storyAt(timeline, 0).arrival[portrait]).toBe(0);
    expect(storyAt(timeline, arrive - 0.375).arrival[portrait]).toBeCloseTo(
      0.5,
    );
    expect(storyAt(timeline, arrive).arrival[portrait]).toBe(1);
    expect(storyAt(timeline, timeline.length).arrival[portrait]).toBe(1);
  });

  it("finds reading distances inside each read", () => {
    const [start, end] = readRange(timeline, portrait);
    expect(readDistance(timeline, portrait, 0)).toBe(start);
    expect(readDistance(timeline, portrait, 2)).toBe(end);
    expect(readDistance(timeline, portrait, 0.5)).toBeCloseTo(
      (start + end) / 2,
    );
    for (let page = 0; page < 2; page++) {
      const state = storyAt(
        timeline,
        readDistance(timeline, macbook, pageFraction(page, 2)),
      );
      expect(state.active).toBe(macbook);
      expect(pageOffset(state.reading[macbook], 2)).toBe(page);
    }
  });

  it("keeps the reader's place when the read is re-measured", () => {
    const longer = buildTimeline({ portrait: 2.6, macbook: 1 });
    const [start, end] = readRange(timeline, portrait);
    const d = start + (end - start) * 0.4;
    const moved = remapDistance(timeline, longer, d);
    expect(storyAt(longer, moved).reading[portrait]).toBeCloseTo(0.4);
    // Outside the read, the same moment of travel.
    const travel = storyAt(timeline, 0.6).travel;
    expect(storyAt(longer, remapDistance(timeline, longer, 0.6)).travel).toBe(
      travel,
    );
    expect(longer.length - timeline.length).toBeCloseTo(0.9);
  });

  it("never lets a read collapse", () => {
    const empty = buildTimeline({ portrait: 0, macbook: 0 });
    const [start, end] = readRange(empty, portrait);
    expect(end).toBeGreaterThan(start);
  });

  it("pages hold their first and final card and move monotonically", () => {
    for (const count of [2, 3]) {
      expect(pageOffset(0, count)).toBe(0);
      expect(pageOffset(1, count)).toBe(count - 1);
      let previous = 0;
      for (let n = 0; n <= 100; n++) {
        const value = pageOffset(n / 100, count);
        expect(value).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
    }
  });
});

describe("desk story camera", () => {
  it("frames each close-up so its screen scale follows from the viewport", () => {
    // Height-bound on a desktop: the monitor fills 1/1.3 of the height.
    const desktop = closeupScale(portrait, 1440, 900);
    expect(desktop * 1000 * (0.531 / 0.299)).toBeCloseTo(900 / 1.3, 0);
    // Width-bound on a phone: it fills 1/1.16 of the width.
    expect(closeupScale(portrait, 390, 844) * 1000).toBeCloseTo(390 / 1.16, 0);
  });

  it("places close-up cameras on each screen's normal", () => {
    const anchors = cameraAnchors(1440, 900);
    const offset = anchors.portrait.position
      .clone()
      .sub(anchors.portrait.target);
    offset.normalize();
    expect(offset.x).toBeCloseTo(0.139173, 4);
    expect(offset.z).toBeCloseTo(0.990268, 4);
    expect(anchors.desktop.position.z).toBe(1.25);
    expect(cameraAnchors(390, 844).desktop.position.z).toBe(1.05);
  });
});
