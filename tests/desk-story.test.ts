import { describe, it, expect } from "vitest";
import { cameraAnchors } from "../src/lib/desk-story/anchors";
import {
  closeupScale,
  divesAt,
  screenStops,
} from "../src/lib/desk-story/camera";
import {
  arrivalDistance,
  buildTimeline,
  cubicBezier,
  travelEasing,
  lengths,
  holds,
  readDistance,
  readRange,
  remapDistance,
  riseRange,
  roomDistance,
  exitRange,
  curtain,
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

  it("builds one state per distance and shares it with every reader", () => {
    // The journey, the desk's scroll listener and its frame read the same
    // distance in one scroll frame.
    const d = readDistance(timeline, portrait, 0.4);
    const shared = storyAt(timeline, d);
    expect(storyAt(timeline, d)).toBe(shared);
    expect(storyAt(timeline, d)).toBe(shared);
    // A new distance or a re-measured story builds a new state, and the
    // shared one is left as it was.
    const copy = structuredClone(shared);
    const next = storyAt(timeline, d + 0.01);
    expect(next).not.toBe(shared);
    expect(next.reading[portrait]).toBeGreaterThan(shared.reading[portrait]);
    expect(shared).toEqual(copy);
    const longer = buildTimeline({ portrait: 2.5, macbook: 1 });
    const remeasured = storyAt(longer, d);
    expect(remeasured).not.toBe(shared);
    expect(remeasured.reading[portrait]).toBeCloseTo((0.4 * 1.7) / 2.5);
    expect(storyAt(timeline, d)).toEqual(copy);
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
    // The MacBook rests on its desktop, then the Explorer rises before the
    // list is read.
    const [riseStart, riseEnd] = riseRange(timeline, macbook);
    expect(riseStart - arrivalDistance(timeline, macbook)).toBeCloseTo(0.5);
    expect(readRange(timeline, macbook)[0]).toBeCloseTo(riseEnd);
    const rising = storyAt(timeline, (riseStart + riseEnd) / 2);
    expect(rising.active).toBe(macbook);
    expect(rising.rise[macbook]).toBeCloseTo(0.5);
    expect(storyAt(timeline, riseStart - 0.01).rise[macbook]).toBe(0);
    expect(storyAt(timeline, timeline.length).rise[macbook]).toBe(1);
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

  it("parts Bliss as the camera arrives and leaves the MacBook", () => {
    const arrive = arrivalDistance(timeline, macbook);
    const [, end] = readRange(timeline, macbook);
    expect(storyAt(timeline, arrive - 0.5).arrival[macbook]).toBeCloseTo(0.5);
    expect(storyAt(timeline, arrive).departure[macbook]).toBe(0);
    expect(storyAt(timeline, end + 0.75).departure[macbook]).toBeCloseTo(0.5);
  });

  it("dives a screen into the view and back out around its stop", () => {
    const diving = buildTimeline({
      portrait: 1.7,
      macbook: 1,
      dive: { portrait: false, macbook: true },
    });
    expect(diving.length - timeline.length).toBeCloseTo(2 * lengths.dive);
    const arrive = arrivalDistance(diving, macbook);
    const [, end] = readRange(diving, macbook);
    // Readable only once the screen fills the view.
    expect(storyAt(diving, arrive).dive[macbook]).toBe(1);
    expect(
      storyAt(diving, arrive - lengths.dive / 2).dive[macbook],
    ).toBeCloseTo(0.5);
    expect(storyAt(diving, arrive - lengths.dive / 2).active).toBe(macbook);
    expect(storyAt(diving, end + lengths.dive).dive[macbook]).toBe(0);
    expect(storyAt(diving, end + lengths.dive / 2).dive[macbook]).toBeCloseTo(
      0.5,
    );
    expect(Math.max(...storyAt(timeline, arrive).dive)).toBe(0);
    // A resize that adds a dive keeps the reader in the same place.
    const [start, stop] = readRange(timeline, portrait);
    const d = start + (stop - start) * 0.3;
    expect(
      storyAt(diving, remapDistance(timeline, diving, d)).reading[portrait],
    ).toBeCloseTo(0.3);
    const list = readRange(timeline, macbook);
    const reading = list[0] + (list[1] - list[0]) * 0.6;
    expect(
      storyAt(diving, remapDistance(timeline, diving, reading)).reading[
        macbook
      ],
    ).toBeCloseTo(0.6);
  });
});

describe("desk story camera", () => {
  it("frames each close-up so its screen scale follows from the viewport", () => {
    // Height-bound on a desktop: the monitor fills 1/1.15 of the height,
    // the MacBook 1/1.3.
    const desktop = closeupScale(portrait, 1440, 900);
    expect(desktop * 1000 * (0.531 / 0.299)).toBeCloseTo(900 / 1.15, 0);
    const laptop = closeupScale(macbook, 1440, 900);
    expect(laptop * 1280 * (0.194 / 0.298)).toBeCloseTo(900 / 1.3, 0);
    // Width-bound on a phone: it fills 1/1.16 of the width.
    expect(closeupScale(portrait, 390, 844) * 1000).toBeCloseTo(390 / 1.16, 0);
  });

  it("dives only screens too small to read on the desk", () => {
    expect(divesAt(portrait, 1440, 900)).toBe(false);
    expect(divesAt(macbook, 1440, 900)).toBe(false);
    expect(divesAt(macbook, 768, 1024)).toBe(false);
    // A portrait phone reads the monitor but not the MacBook.
    expect(divesAt(portrait, 390, 844)).toBe(false);
    expect(divesAt(macbook, 390, 844)).toBe(true);
    // A landscape phone, like 200% zoom, dives both.
    expect(divesAt(portrait, 844, 390)).toBe(true);
    expect(divesAt(macbook, 844, 390)).toBe(true);
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

describe("paper curtain", () => {
  it("ends the story on an exit after the final hold, with the camera still", () => {
    const timeline = buildTimeline({ portrait: 1, macbook: 1, exit: true });
    const exit = exitRange(timeline)!;
    expect(exit[1]).toBeCloseTo(timeline.length);
    expect(exit[1] - exit[0]).toBeCloseTo(lengths.exit);
    // The final view's hold comes just before it.
    expect(exit[0] - roomDistance(timeline)).toBeCloseTo(holds.room);
    for (const fraction of [0, 0.5, 1]) {
      const state = storyAt(timeline, exit[0] + fraction * lengths.exit);
      expect(state.from).toBe("room");
      expect(state.to).toBe("room");
      expect(state.travel).toBe(0);
    }
    expect(storyAt(timeline, exit[0] - 0.01).exit).toBe(0);
    expect(storyAt(timeline, exit[0] + 0.5).exit).toBeCloseTo(0.5);
    expect(storyAt(timeline, timeline.length).exit).toBe(1);
    expect(storyAt(timeline, exit[0] - 0.1).segment).toBe("hold");
  });
  it("has no exit without the curtain, and About's lengths match the story", () => {
    const timeline = buildTimeline({ portrait: 1, macbook: 1 });
    expect(exitRange(timeline)).toBeNull();
    expect(timeline.length - roomDistance(timeline)).toBeCloseTo(holds.room);
    expect(curtain.landing).toBeCloseTo(holds.room + lengths.exit);
    expect(curtain.lead).toBeCloseTo(curtain.landing + 1);
  });
});

describe("travel pacing", () => {
  it("keeps every easing between its ends and never turning back", () => {
    for (const curve of Object.values(travelEasing)) {
      let previous = 0;
      for (let i = 0; i <= 100; i++) {
        const value = curve!(i / 100);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = value;
      }
      expect(curve!(0)).toBe(0);
      expect(curve!(1)).toBe(1);
    }
  });
  it("matches CSS cubic-bezier at a known point", () => {
    // ease-in-out's midpoint is 0.5 by symmetry.
    expect(cubicBezier(0.42, 0, 0.58, 1)(0.5)).toBeCloseTo(0.5, 5);
  });
  it("passes through the desktop moving instead of stopping", () => {
    const timeline = buildTimeline();
    expect(
      timeline.segments.some((s) => s.kind === "hold" && s.from === "desktop"),
    ).toBe(false);
    const into = travelEasing["opening>desktop"]!;
    const out = travelEasing["desktop>portrait"]!;
    // Both still move at the join: a slope well above zero on each side.
    expect((1 - into(0.98)) / 0.02).toBeGreaterThan(0.2);
    expect(out(0.02) / 0.02).toBeGreaterThan(0.2);
  });
});
