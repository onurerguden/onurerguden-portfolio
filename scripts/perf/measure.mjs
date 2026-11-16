// Measures how smooth the home page is for a visitor who starts scrolling as
// soon as it opens, in Chromium on this machine's real GPU.
//
//   node scripts/perf/measure.mjs [--url http://localhost:3100/en]
//     [--scenario first-visit,returning,cpu4,reduced] [--runs 3]
//     [--input measure,notch,trackpad] [--device "iPhone 13"]
//     [--trace [--save-trace]] [--headed] [--seed 1] [--label baseline]
//     [--out dir]
//     [--quality low|high] [--cpu 6] [--gpu 24] [--viewport 1536x730@1.25]
//     [--profile igpu-120] [--no-stops] [--check]
//
// Scenarios:
// - first-visit: a new browser profile and shaders the GPU has never seen
//   (inject.js changes every shader's source), as for a first-time visitor.
// - fresh: a new profile on a GPU that has compiled the site's shaders
//   before; with first-visit, it tells shader cost from everything else.
// - returning: the same profile after one full visit; HTTP and shader caches
//   are warm.
// - cpu4: returning, with the CPU slowed four times (a mid-range laptop).
// - reduced: reduced motion, the static flow (no WebGL).
//
// Inputs (how the visitor scrolls):
// - measure: 120 px every 100 ms, the steady flick the budgets started with.
// - notch: a mouse wheel's notches, 100–120 px every 80–150 ms.
// - trackpad: a trackpad's stream, 6–30 px every 8–16 ms.
// Headless Chromium applies each wheel event in one frame, so notch tests
// the cost of each event, not a browser's animated wheel scrolling.
// --device emulates a phone (Playwright's device list) and scrolls with touch
// gestures. --headed opens a window on this display instead: the only way to
// measure a 120 Hz screen, since headless runs at 60 Hz.
//
// A computer other than this one (the estimated laptop profile, docs/qa/perf):
// - --quality forces the site's 3D tier (src/lib/quality.ts), as its GPU
//   check would pick on, say, integrated Intel graphics.
// - --cpu slows the CPU of every measured visit that many times (cpu4 alone
//   otherwise); the warm-up visit of returning scenarios runs at full speed.
// - --gpu adds that many iterations of arithmetic to every fragment the
//   page's canvases shade (inject.js), for a GPU that shades more slowly than
//   this one. It stands in for fill-rate-bound integrated graphics; how many
//   iterations match a given GPU is calibrated in docs/qa/perf/README.md.
// - --viewport sets the window's CSS size and device pixel ratio
//   (1536x730@1.25: a 1920 × 1080 laptop at Windows' default 125% scale,
//   with Chrome's toolbars).
//
// A class of computer (--profile, the flow series' device matrix): a named
// set of the options above, each of which a flag still overrides. The
// profiles are listed below; docs/qa/perf/README.md says what each stands
// for. A profile's results are checked against its own ceilings
// (`profiles.<name>` in tests/perf/budgets.json).
//
// Each run also stops at the story's stops (unless --no-stops) and records
// what the compositor has to blend there: the layers that draw content and
// their area, and each canvas's draw calls and triangles. --gpu does not
// slow the browser's own compositing, so that area is the stand-in for it.
//
// Results (medians over the runs) go to docs/qa/perf/<label>.{json,md}, or
// to --out. --check compares them with tests/perf/budgets.json and fails when
// over. CI renders WebGL in software, so this runs on a GPU-backed machine.
import { chromium, devices } from "playwright";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { readTrace, summarizeTrace } from "./trace.mjs";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3100/en" },
    scenario: { type: "string" },
    input: { type: "string" },
    device: { type: "string" },
    runs: { type: "string", default: "3" },
    seed: { type: "string", default: "1" },
    trace: { type: "boolean", default: false },
    "save-trace": { type: "boolean", default: false },
    headed: { type: "boolean", default: false },
    label: { type: "string", default: "latest" },
    out: { type: "string", default: "docs/qa/perf" },
    check: { type: "boolean", default: false },
    quality: { type: "string" },
    cpu: { type: "string" },
    gpu: { type: "string" },
    viewport: { type: "string" },
    profile: { type: "string" },
    "no-stops": { type: "boolean", default: false },
  },
});
/**
 * Classes of computer the site is measured as (docs/qa/perf/README.md). The
 * lab is an M1 Pro; the others slow it down to stand in for the class.
 */
const laptop = "1536x730@1.25";
const scrolled = { scenario: "returning", input: "notch,trackpad" };
const profiles = {
  // This machine as it is: the budgets the earlier series set.
  "m1-60": {},
  // The same on its 120 Hz display (a window; headless draws at 60 Hz).
  "m1-120": { ...scrolled, headed: true },
  // Integrated graphics on a 60 Hz laptop screen.
  "igpu-60": {
    ...scrolled,
    viewport: laptop,
    quality: "low",
    cpu: "2",
    gpu: "80",
  },
  // Integrated graphics behind a 120 Hz screen: frames that cannot keep up
  // arrive unevenly unless the site paces them.
  "igpu-120": {
    ...scrolled,
    viewport: laptop,
    quality: "low",
    cpu: "2",
    gpu: "80",
    headed: true,
  },
  // A slow GPU the site takes for a fast one, until its frames say otherwise.
  "igpu-misread": { ...scrolled, viewport: laptop, cpu: "2", gpu: "320" },
  // An old processor with integrated graphics.
  "cpu-slow": { ...scrolled, viewport: laptop, quality: "low", cpu: "4" },
  "cpu-slower": { ...scrolled, viewport: laptop, quality: "low", cpu: "6" },
  phone: { scenario: "returning,cpu4", device: "iPhone 13" },
  "phone-android": { scenario: "returning,cpu4", device: "Pixel 7" },
};
if (values.profile && !profiles[values.profile])
  throw new Error(
    `--profile is one of ${Object.keys(profiles).join(", ")}, not ${values.profile}`,
  );
// A flag wins over the profile, which wins over the defaults.
for (const [key, value] of Object.entries(profiles[values.profile] ?? {}))
  if (values[key] === undefined || values[key] === false) values[key] = value;
values.scenario ??= "first-visit,returning,cpu4,reduced";
values.input ??= "measure";
if (values.quality && !["high", "low"].includes(values.quality))
  throw new Error(`--quality is high or low, not ${values.quality}`);
const cpuRate = values.cpu ? Number(values.cpu) : null;
if (cpuRate !== null && !(cpuRate >= 1))
  throw new Error(`--cpu is a slowdown of 1 or more, not ${values.cpu}`);
const gpuLoad = values.gpu ? Number(values.gpu) : 0;
if (!(gpuLoad >= 0))
  throw new Error(`--gpu is a loop count of 0 or more, not ${values.gpu}`);
/** "1536x730@1.25" → { width, height, scale }. */
const window_ = values.viewport
  ? (() => {
      const match = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(values.viewport);
      if (!match)
        throw new Error(`--viewport is WxH@dpr, not ${values.viewport}`);
      return {
        width: Number(match[1]),
        height: Number(match[2]),
        scale: Number(match[3] ?? 1),
      };
    })()
  : null;
const inject = path.resolve("scripts/perf/inject.js");
// A phone's viewport, scale, touch and user agent; Chromium stands in for
// the device's own browser.
const device = values.device
  ? Object.fromEntries(
      Object.entries(devices[values.device] ?? {}).filter(
        ([key]) => key !== "defaultBrowserType",
      ),
    )
  : null;
if (device && !device.viewport) throw new Error(`No device ${values.device}`);
const viewport =
  device?.viewport ??
  (window_
    ? { width: window_.width, height: window_.height }
    : { width: 1440, height: 900 });
const scale = window_?.scale ?? 2;
const args = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];
const traceCategories = [
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "v8.execute",
  "blink.user_timing",
  "benchmark",
  "graphics.pipeline",
].join(",");

/** A small seeded generator, so runs of one input scroll alike. */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (next, low, high) => low + (high - low) * next();

/** Scrolls from 0.7 s after load to the end of the page, as `input`. */
async function scrollThrough(page, cdp, input, run) {
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.waitForTimeout(700);
  const next = random(Number(values.seed) * 1000 + run);
  const started = await page.evaluate(() => performance.now());
  const deadline = Date.now() + 45000;
  const atEnd = () =>
    page.evaluate(
      () => scrollY + innerHeight >= document.documentElement.scrollHeight - 4,
    );
  let events = 0;
  while (Date.now() < deadline) {
    if (input === "touch") {
      await cdp.send("Input.synthesizeScrollGesture", {
        x: Math.round(viewport.width / 2),
        y: Math.round(viewport.height * 0.7),
        yDistance: -Math.round(between(next, 300, 600)),
        speed: Math.round(between(next, 900, 1600)),
        gestureSourceType: "touch",
      });
      await page.waitForTimeout(between(next, 150, 500));
    } else if (input === "notch") {
      await page.mouse.wheel(0, Math.round(between(next, 100, 120)));
      await page.waitForTimeout(between(next, 80, 150));
    } else if (input === "trackpad") {
      await page.mouse.wheel(0, Math.round(between(next, 6, 30)));
      await page.waitForTimeout(between(next, 8, 16));
    } else {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(100);
    }
    // Checking for the end costs a round trip; a trackpad checks less often.
    if (input !== "trackpad" || ++events % 10 === 0) if (await atEnd()) break;
  }
  const ended = await page.evaluate(() => performance.now());
  await page.waitForTimeout(2000);
  return [started, ended];
}

/** Where the page's regions start and end, in scroll positions. */
function regionsInPage() {
  const section = document.querySelector("[data-story]");
  const story = section?.dataset.story
    ? JSON.parse(section.dataset.story)
    : null;
  const stage = document.querySelector("[data-journey-stage]");
  const work = document.getElementById("work");
  const top = (node) => node.getBoundingClientRect().top + scrollY;
  if (!story || !stage) return [["page", Infinity]];
  const at = (distance) => top(section) + stage.offsetHeight * distance;
  return [
    ["opening", at(story.chapters.services ?? story.portrait[0])],
    ["monitor", at(story.macbook[0])],
    ["macbook", at(story.macbook[1])],
    ["room", at(story.length)],
    ["about", work ? top(work) : Infinity],
    ["flow", Infinity],
  ];
}

async function visit(context, scenario, input, measured, run) {
  const page = await context.newPage();
  await page.addInitScript((config) => (window.__perfConfig = config), {
    bustShaderCache: scenario === "first-visit",
    gpu: true,
    probeStyle: true,
    // The first visit of a returning scenario gets the same load, so the
    // measured visit finds the same shader sources in the caches.
    gpuLoad,
  });
  // The scene's QA attributes (data-camera and the like) are written only
  // for QA, so a visitor's frames skip them.
  await page.addInitScript((tier) => {
    try {
      localStorage.setItem("portfolio:qa", "1");
      if (tier) localStorage.setItem("portfolio:quality", tier);
    } catch {
      // Storage can be blocked; the numbers that need it stay empty.
    }
  }, values.quality ?? null);
  await page.addInitScript({ path: inject });
  const cdp = await context.newCDPSession(page);
  const rate = cpuRate ?? (scenario === "cpu4" ? 4 : 1);
  if (measured && rate > 1)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  const tracing = values.trace && measured;
  if (tracing)
    await cdp.send("Tracing.start", {
      // A saved trace also samples JavaScript, so DevTools can name the
      // functions behind a long frame.
      categories: values["save-trace"]
        ? `${traceCategories},disabled-by-default-v8.cpu_profiler`
        : traceCategories,
      transferMode: "ReturnAsStream",
    });
  await page.goto(values.url, { waitUntil: "commit" });
  // The display's refresh rate, from idle frames before the visitor scrolls.
  const refresh = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        const tick = (now) => {
          times.push(now);
          if (times.length < 40) requestAnimationFrame(tick);
          else {
            const gaps = times
              .slice(1)
              .map((t, i) => t - times[i])
              .sort((a, b) => a - b);
            resolve(Math.round(1000 / gaps[Math.floor(gaps.length / 2)]));
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  const [scrollStart, scrollEnd] = await scrollThrough(page, cdp, input, run);
  const result = measured
    ? await page.evaluate((regionsSource) => {
        const nav = performance.getEntriesByType("navigation")[0];
        const paint = performance
          .getEntriesByType("paint")
          .find((entry) => entry.name === "first-contentful-paint");
        const bytes = {};
        for (const entry of performance.getEntriesByType("resource")) {
          const kind = /\.js(\?|$)/.test(entry.name)
            ? "script"
            : /\.(glb|wasm)(\?|$)|draco/.test(entry.name)
              ? "model"
              : /\.(avif|webp|png|jpe?g|svg)(\?|$)/.test(entry.name)
                ? "image"
                : /\.woff2/.test(entry.name)
                  ? "font"
                  : "other";
          bytes[kind] = (bytes[kind] || 0) + entry.transferSize;
        }
        return {
          ...window.__perf,
          ttfb: nav.responseStart,
          fcp: paint?.startTime ?? null,
          lcp: window.__perf.lcp ?? null,
          bytes,
          regions: new Function(`return (${regionsSource})()`)(),
          marks: Object.fromEntries(
            performance
              .getEntriesByType("mark")
              .filter((mark) => mark.name.startsWith("portfolio:"))
              .map((mark) => [mark.name.slice(10), Math.round(mark.startTime)]),
          ),
        };
      }, regionsInPage.toString())
    : null;
  if (tracing) {
    const complete = new Promise((resolve) =>
      cdp.once("Tracing.tracingComplete", resolve),
    );
    await cdp.send("Tracing.end");
    const { stream } = await complete;
    const events = await readTrace(cdp, stream);
    // The whole trace, for DevTools' Performance panel (large: use --out).
    if (values["save-trace"]) {
      await mkdir(values.out, { recursive: true });
      await writeFile(
        path.join(
          values.out,
          `${values.label}-${scenario}-${input}-${run + 1}.trace.json`,
        ),
        JSON.stringify({ traceEvents: events }),
      );
    }
    result.trace = summarizeTrace(
      events,
      [scrollStart, scrollEnd],
      result.frames,
    );
  }
  await page.close();
  return result && { ...result, scrollStart, scrollEnd, refresh };
}

const quantile = (list, q) => {
  if (!list.length) return 0;
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
};
const round = (n) => Math.round(n * 100) / 100;
/** The longest run of consecutive slow frames. */
const streak = (intervals, over) => {
  let longest = 0;
  let current = 0;
  for (const interval of intervals) {
    current = interval > over ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
};

/**
 * How evenly a canvas drew while it kept drawing. Each frame it draws lasts a
 * whole number of the display's refreshes; a canvas that keeps up holds one
 * number (1 at the display's rate, 2 when paced to half of it), and one that
 * cannot wavers between them, which is seen as judder even when the average
 * rate is high. `uneven` is the share of its frames off the usual number.
 */
function cadenceOf(frames, label, refresh) {
  const vsync = 1000 / (refresh || 60);
  const gaps = [];
  let since = 0;
  let drawing = false;
  for (const [, interval, , drew] of frames) {
    since += interval;
    if (!drew || !drew.split(",").includes(label)) continue;
    // A longer wait is a pause in what it draws for, not a late frame.
    if (drawing && since <= 6 * vsync) gaps.push(since);
    drawing = true;
    since = 0;
  }
  if (gaps.length < 20) return null;
  const counts = gaps.map((gap) => Math.max(1, Math.round(gap / vsync)));
  const tally = new Map();
  for (const count of counts) tally.set(count, (tally.get(count) || 0) + 1);
  const [usual] = [...tally].sort((a, b) => b[1] - a[1])[0];
  return {
    frames: gaps.length,
    fps: round(1000 / quantile(gaps, 0.5)),
    every: usual,
    uneven: round(
      (100 * counts.filter((count) => count !== usual).length) / counts.length,
    ),
  };
}

/** Where the story stops, as scroll positions; see stops.mjs. */
function stopsInPage() {
  const section = document.querySelector("[data-story]");
  const story = section?.dataset.story
    ? JSON.parse(section.dataset.story)
    : null;
  const stage = document.querySelector("[data-journey-stage]");
  const about = document.getElementById("about");
  if (!story || !stage) return [];
  const top = (node) => node.getBoundingClientRect().top + scrollY;
  const at = (distance) => top(section) + stage.offsetHeight * distance;
  const along = (range, f) => range[0] + (range[1] - range[0]) * f;
  return [
    ["opening", 0],
    ["monitor", at(story.chapters.services + 0.25)],
    // The XP desktop with the balls on it, before the Explorer rises.
    ["balls", at(story.macbook[0])],
    ["explorer", at(along(story.macbook, 0.35))],
    ["room", at(story.room)],
    // Past the curtain: the desk is gone and About fills the window.
    ...(about ? [["about", Math.max(top(about), at(story.length))]] : []),
  ];
}

/** The compositor's layers now, or null where the browser does not say. */
async function layersOf(cdp) {
  const tree = new Promise((resolve) => {
    const done = (event) => {
      if (!event.layers) return;
      cdp.off("LayerTree.layerTreeDidChange", done);
      resolve(event.layers);
    };
    cdp.on("LayerTree.layerTreeDidChange", done);
    setTimeout(() => resolve(null), 6000);
  });
  await cdp.send("LayerTree.enable");
  const layers = await tree;
  await cdp.send("LayerTree.disable");
  return layers;
}

/**
 * The part of the window a layer covers, in CSS pixels: its box through its
 * screen-space transform (column-major, as the browser reports it), clipped
 * to the window. A layer behind the viewer covers nothing.
 */
function areaInView(layer) {
  const t = layer.transform ?? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const [x, y] of [
    [0, 0],
    [layer.width, 0],
    [0, layer.height],
    [layer.width, layer.height],
  ]) {
    const w = t[3] * x + t[7] * y + t[15];
    if (w <= 0) return 0;
    const px = (t[0] * x + t[4] * y + t[12]) / w;
    const py = (t[1] * x + t[5] * y + t[13]) / w;
    left = Math.min(left, px);
    right = Math.max(right, px);
    top = Math.min(top, py);
    bottom = Math.max(bottom, py);
  }
  const width = Math.min(viewport.width, right) - Math.max(0, left);
  const height = Math.min(viewport.height, bottom) - Math.max(0, top);
  return width > 0 && height > 0 ? width * height : 0;
}

/**
 * One still visit that stops at each of the story's stops and records what
 * is on screen there: the compositor's layers that draw content in the
 * window, the area they cover in views (a layer the size of the window is
 * 1), and each canvas's draw calls and triangles. The compositor blends
 * every one of them on each frame something moves, so this area is what a
 * slow GPU pays outside the page's own WebGL. It ignores what an opaque
 * layer in front hides, so read it as a change between two builds, not as
 * an amount of work.
 */
async function stopsOf(context) {
  const page = await context.newPage();
  await page.addInitScript((tier) => {
    try {
      localStorage.setItem("portfolio:qa", "1");
      if (tier) localStorage.setItem("portfolio:quality", tier);
    } catch {
      // Storage can be blocked; the stops then lack the canvases' counters.
    }
  }, values.quality ?? null);
  const cdp = await context.newCDPSession(page);
  const out = {};
  try {
    await page.goto(values.url);
    await page.waitForSelector('[data-ready="true"]', { timeout: 60000 });
    await page.waitForSelector("[data-story]", { timeout: 20000 });
    const view = viewport.width * viewport.height;
    for (const [name, top] of await page.evaluate(
      `(${stopsInPage.toString()})()`,
    )) {
      await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), top);
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      // The camera's travel, a scene's mount on the pause, the balls' drop.
      await page.waitForTimeout(3500);
      const layers = await layersOf(cdp);
      const drawn = (layers ?? [])
        .filter((layer) => layer.drawsContent && !layer.invisible)
        .map(areaInView)
        .filter((area) => area > 0);
      const canvases = await page.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll("canvas")]
            .filter((canvas) => canvas.isConnected)
            .map((canvas) => {
              const stage = canvas.dataset.stageCanvas;
              return [
                stage === "desk-stack" ? "balls" : (stage ?? "desk"),
                {
                  calls: Number(
                    canvas.dataset.stageDrawCalls ??
                      canvas.dataset.drawCalls ??
                      0,
                  ),
                  triangles: Number(
                    canvas.dataset.stageTriangles ??
                      canvas.dataset.triangles ??
                      0,
                  ),
                  pixels: canvas.width * canvas.height,
                },
              ];
            }),
        ),
      );
      out[name] = {
        layers: layers ? drawn.length : null,
        area: layers
          ? round(drawn.reduce((sum, area) => sum + area, 0) / view)
          : null,
        canvases,
      };
    }
  } finally {
    await page.close();
  }
  return out;
}

/** One run's numbers: only what happens after the first paint counts. */
function summarize(run) {
  const after = run.fcp ?? 0;
  const loaf = run.loaf.filter((entry) => entry.start >= after);
  const scrolling = run.frames.filter(
    ([start]) => start >= run.scrollStart && start <= run.scrollEnd,
  );
  const intervals = scrolling.map(([, interval]) => interval);
  const ready = run.milestones["desk-ready"];
  const glAfterReady = Object.values(run.gl)
    .flatMap((entry) => entry.at)
    .filter(([start]) => ready !== undefined && start >= ready)
    .reduce((sum, [, time]) => sum + time, 0);
  const worst = [...loaf].sort((a, b) => b.duration - a.duration)[0];
  // A frame later than this missed its slot on this display.
  const slow = (1000 / (run.refresh || 60)) * 1.2;

  // Frames, GPU time and canvases drawn in each region of the page.
  const regionOf = (y) => run.regions.find(([, end]) => y < end)?.[0] ?? "?";
  const scrollAt = new Map(run.frames.map(([start, , y]) => [start, y]));
  const regions = {};
  for (const [name] of run.regions) {
    const frames = scrolling.filter(([, , y]) => regionOf(y) === name);
    if (!frames.length) continue;
    const times = frames.map(([, interval]) => interval);
    const drew = {};
    for (const [, , , canvases] of frames)
      for (const canvas of canvases ? canvases.split(",") : [])
        drew[canvas] = (drew[canvas] || 0) + 1;
    const gpu = {};
    for (const [canvas, entries] of Object.entries(run.gpu)) {
      const inRegion = entries
        .filter(
          ([start]) =>
            start >= run.scrollStart &&
            start <= run.scrollEnd &&
            regionOf(scrollAt.get(start) ?? -1) === name,
        )
        .map(([, ms]) => ms);
      if (inRegion.length)
        gpu[canvas] = [quantile(inRegion, 0.5), quantile(inRegion, 0.95)];
    }
    regions[name] = {
      frames: times.length,
      p50: quantile(times, 0.5),
      p95: quantile(times, 0.95),
      p99: quantile(times, 0.99),
      slowShare: round(
        (100 * times.filter((t) => t > slow).length) / times.length,
      ),
      slowStreak: streak(times, slow),
      drew,
      gpu,
    };
  }

  // How far the desk's camera moved in each frame it moved. A notch that
  // moves the camera in one go shows as a large step; the story's clock
  // spreads it over several frames.
  const steps = scrolling.map(([, , , , step]) => step).filter((s) => s > 0);
  const gpuAll = {};
  for (const [canvas, entries] of Object.entries(run.gpu)) {
    const ms = entries
      .filter(([start]) => start >= run.scrollStart && start <= run.scrollEnd)
      .map(([, time]) => time);
    if (ms.length) gpuAll[canvas] = [quantile(ms, 0.5), quantile(ms, 0.95)];
  }
  const programmatic = run.scrolls.filter(([at]) => at >= after);
  const cadence = Object.fromEntries(
    ["desk", "balls", "about"]
      .map((label) => [label, cadenceOf(scrolling, label, run.refresh)])
      .filter(([, value]) => value),
  );

  return {
    refresh: run.refresh,
    ttfb: Math.round(run.ttfb),
    fcp: Math.round(run.fcp ?? 0),
    lcp: Math.round(run.lcp ?? 0),
    deskReady: ready ?? null,
    maxLoaf: worst?.duration ?? 0,
    maxLoafAt: worst?.start ?? null,
    maxLoafSource: worst?.scripts[0]
      ? `${worst.scripts[0].invoker} (${worst.scripts[0].source})`
      : "",
    loafsOver100: loaf.filter((entry) => entry.duration > 100).length,
    loafsOver50: loaf.filter((entry) => entry.duration > 50).length,
    // Long frames once the visitor is scrolling and the desk is ready.
    scrollLoafsOver50: loaf.filter(
      (entry) =>
        entry.duration > 50 &&
        entry.start >= run.scrollStart &&
        entry.start <= run.scrollEnd &&
        (ready === undefined || entry.start >= ready),
    ).length,
    scrollFrames: intervals.length,
    scrollP50: quantile(intervals, 0.5),
    scrollP95: quantile(intervals, 0.95),
    scrollP99: quantile(intervals, 0.99),
    scrollOver50: intervals.filter((interval) => interval > 50).length,
    slowShare: round(
      (100 * intervals.filter((t) => t > slow).length) /
        Math.max(1, intervals.length),
    ),
    gaps: scrolling
      .filter(([, interval]) => interval > 50)
      .map(([start, interval]) => [start, interval]),
    regions,
    gpu: gpuAll,
    deskGpuP95: gpuAll.desk?.[1] ?? 0,
    aboutGpuP95: gpuAll.about?.[1] ?? 0,
    ballsGpuP95: gpuAll.balls?.[1] ?? 0,
    // The device pixels per CSS pixel the desk ended the visit at.
    deskDpr: run.deskDpr ?? undefined,
    cadence,
    deskUneven: cadence.desk?.uneven,
    ballsUneven: cadence.balls?.uneven,
    aboutUneven: cadence.about?.uneven,
    deskFps: cadence.desk?.fps,
    // About's frames while the journey's curtain still covers it.
    aboutFramesInRoom: regions.room?.drew.about ?? 0,
    cameraStepP50: round(quantile(steps, 0.5) * 100) / 100,
    cameraStepMax: round(Math.max(0, ...steps) * 100) / 100,
    programmaticScrolls: programmatic.length,
    tinyScrolls: programmatic.filter(
      ([, , before, top]) => top !== null && Math.abs(top - before) < 1,
    ).length,
    scrollCalls: programmatic,
    dirtyStyleShare: round(
      (100 * run.dirtyScrollEvents) / Math.max(1, run.scrollEvents),
    ),
    dprReduced: Object.keys(run.milestones).some((name) =>
      name.startsWith("dpr-reduced"),
    )
      ? 1
      : 0,
    // The site took the low tier by itself: a desk that could not keep up
    // on this visit, or on one in the week before it.
    lowTier: "quality:low" in run.milestones ? 1 : 0,
    glBlocking: Math.round(
      Object.values(run.gl).reduce((sum, entry) => sum + entry.ms, 0),
    ),
    glBlockingAfterReady: Math.round(glAfterReady),
    // The WebGL calls that blocked for longer than a frame, and when.
    glCalls: Object.entries(run.gl).flatMap(([name, entry]) =>
      entry.at.map(([start, time]) => [start, time, name]),
    ),
    programs: run.programs,
    programAt: run.programAt,
    shaders: run.shaders,
    contexts: run.contexts.length,
    scriptBytes: run.bytes.script || 0,
    modelBytes: run.bytes.model || 0,
    imageBytes: run.bytes.image || 0,
    milestones: { ...run.marks, ...run.milestones },
    renderer: run.contexts[0]?.renderer ?? "none",
    parallelCompile: run.contexts[0]?.parallelCompile ?? null,
    ...(run.trace && {
      trace: run.trace,
      wheelMs: run.trace.wheelMs,
      mainP95: run.trace.mainP95,
      partialShare: run.trace.partialShare,
      forcedLayoutMs: run.trace.forcedLayoutMs,
    }),
    longFrames: loaf
      .filter((entry) => entry.duration > 50)
      .map((entry) => ({
        start: entry.start,
        duration: entry.duration,
        render: entry.render,
        layout: entry.layout,
        top: entry.scripts[0]
          ? `${entry.scripts[0].invoker} (${entry.scripts[0].source})`
          : "",
      })),
  };
}

/** The median of every numeric field across runs; the rest from the median run. */
function median(runs) {
  const byLoaf = [...runs].sort((a, b) => a.maxLoaf - b.maxLoaf);
  const middle = byLoaf[Math.floor(byLoaf.length / 2)];
  // What only one run records (the stops) comes from that run.
  const out = { ...Object.assign({}, ...runs), ...middle };
  for (const [key, value] of Object.entries(out))
    if (typeof value === "number")
      out[key] = quantile(
        runs.map((run) => run[key]).filter((n) => typeof n === "number"),
        0.5,
      );
  return out;
}

async function scenarioRun(scenario, input, run) {
  const profile = await mkdtemp(path.join(tmpdir(), "portfolio-perf-"));
  const context = await chromium.launchPersistentContext(profile, {
    headless: !values.headed,
    args,
    ...(device ?? { viewport, deviceScaleFactor: scale }),
    reducedMotion: scenario === "reduced" ? "reduce" : "no-preference",
  });
  try {
    // Returning visitors have been here before: one full visit first.
    if (scenario === "returning" || scenario === "cpu4")
      await visit(context, scenario, input, false, run);
    const result = summarize(await visit(context, scenario, input, true, run));
    // The stops are the same on every run: once per scenario is enough.
    if (!values["no-stops"] && !device && scenario !== "reduced" && run === 0) {
      result.stops = await stopsOf(context);
      for (const [stop, at] of Object.entries(result.stops)) {
        const key = stop[0].toUpperCase() + stop.slice(1);
        if (at.layers !== null) {
          result[`layers${key}`] = at.layers;
          result[`layerArea${key}`] = at.area;
        }
      }
    }
    if (
      scenario !== "reduced" &&
      !device &&
      /swiftshader|llvmpipe|software/i.test(result.renderer)
    )
      throw new Error(
        `Software WebGL (${result.renderer}): results would be meaningless`,
      );
    return result;
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
}

const inputs = values.input.split(",");
const results = {};
for (const scenario of values.scenario.split(","))
  for (const chosen of inputs) {
    const input = device ? "touch" : chosen;
    // "returning" for the steady flick, "returning/trackpad" for another
    // input, "returning@iPhone 13" on a phone.
    const name = `${scenario}${input === "measure" || device ? "" : `/${input}`}${device ? `@${values.device}` : ""}`;
    const runs = [];
    for (let i = 0; i < Number(values.runs); i++) {
      runs.push(await scenarioRun(scenario, input, i));
      const last = runs.at(-1);
      process.stdout.write(
        `${name} #${i + 1}: max frame ${last.maxLoaf} ms, ${last.scrollLoafsOver50} over 50 ms while scrolling, slow ${last.slowShare}% at ${last.refresh} Hz\n`,
      );
    }
    results[name] = { median: median(runs), runs };
    if (device) break;
  }

const columns = [
  ["refresh", "Display (Hz)"],
  ["maxLoaf", "Longest frame (ms)"],
  ["loafsOver100", "Frames > 100 ms"],
  ["loafsOver50", "Frames > 50 ms"],
  ["scrollLoafsOver50", "…while scrolling, desk ready"],
  ["scrollP95", "Scroll p95 (ms)"],
  ["scrollP99", "Scroll p99 (ms)"],
  ["slowShare", "Slow scroll frames (%)"],
  ["scrollOver50", "Scroll frames > 50 ms"],
  ["deskGpuP95", "Desk GPU p95 (ms)"],
  ["ballsGpuP95", "Balls GPU p95 (ms)"],
  ["aboutGpuP95", "About GPU p95 (ms)"],
  ["deskFps", "Desk frames per second while it draws"],
  ["deskUneven", "Uneven desk frames (%)"],
  ["ballsUneven", "Uneven balls frames (%)"],
  ["aboutUneven", "Uneven About frames (%)"],
  ["deskDpr", "Desk resolution at the end (device px per CSS px)"],
  ["aboutFramesInRoom", "About frames under the curtain"],
  ["cameraStepMax", "Camera's largest step in a frame (m)"],
  ["tinyScrolls", "Scrolls under 1 px"],
  ["dirtyStyleShare", "Scroll events with dirty style (%)"],
  ["dprReduced", "Desk lowered its resolution"],
  ["lowTier", "Site took the low tier by itself"],
  ["wheelMs", "Wheel event (ms, trace)"],
  ["mainP95", "Main thread per frame p95 (ms, trace)"],
  ["partialShare", "Partial frames (%, trace)"],
  ["glBlocking", "WebGL blocking (ms)"],
  ["glBlockingAfterReady", "…after desk ready (ms)"],
  ["programs", "Shader programs"],
  ["deskReady", "Desk ready (ms)"],
  ["ttfb", "TTFB (ms)"],
  ["fcp", "FCP (ms)"],
  ["lcp", "LCP (ms)"],
];
const names = Object.keys(results);
const table = [
  `| Metric | ${names.join(" | ")} |`,
  `|---|${names.map(() => "---").join("|")}|`,
  ...columns
    .filter(([key]) =>
      names.some((name) => results[name].median[key] !== undefined),
    )
    .map(
      ([key, label]) =>
        `| ${label} | ${names.map((name) => results[name].median[key] ?? "–").join(" | ")} |`,
    ),
].join("\n");
// Each region of the median run: frame times, slow frames and GPU time.
const regionTables = names
  .map((name) => {
    const regions = Object.entries(results[name].median.regions);
    if (!regions.length) return "";
    return [
      `\n### ${name} by region\n`,
      "| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |",
      "|---|---|---|---|---|---|---|---|",
      ...regions.map(
        ([region, r]) =>
          `| ${region} | ${r.frames} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.slowShare} | ${r.slowStreak} | ${
            Object.entries(r.gpu)
              .map(([canvas, [p50, p95]]) => `${canvas} ${p50}/${p95}`)
              .join(", ") || "–"
          } |`,
      ),
    ].join("\n");
  })
  .join("\n");
// What is on screen at each stop of the story (the first scenario's).
const stopped = names.find((name) => results[name].median.stops);
const stopTable = stopped
  ? [
      `\n### At each stop (${stopped})\n`,
      "| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |",
      "|---|---|---|---|",
      ...Object.entries(results[stopped].median.stops).map(
        ([stop, at]) =>
          `| ${stop} | ${at.layers ?? "–"} | ${at.area ?? "–"} | ${
            Object.entries(at.canvases)
              .map(([canvas, c]) => `${canvas} ${c.calls} / ${c.triangles}`)
              .join(", ") || "–"
          } |`,
      ),
    ].join("\n")
  : "";
const first = Object.values(results)[0]?.median;
const profile = [
  values.profile && `profile ${values.profile}`,
  values.quality && `${values.quality} tier`,
  cpuRate && `CPU ${cpuRate}× slower`,
  gpuLoad && `GPU load ${gpuLoad}`,
]
  .filter(Boolean)
  .map((part) => ` · ${part}`)
  .join("");
const header = `# Performance: ${values.label}\n\n${new Date().toISOString().slice(0, 10)} · ${values.url} · ${first?.renderer ?? ""} · ${values.device ?? `${viewport.width}×${viewport.height} @${scale}x`}${profile}${values.headed ? " · headed" : ""} · medians of ${values.runs} runs\n\n`;
await mkdir(values.out, { recursive: true });
await writeFile(
  path.join(values.out, `${values.label}.json`),
  JSON.stringify(
    {
      url: values.url,
      date: new Date().toISOString(),
      profile: values.profile ?? null,
      results,
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  path.join(values.out, `${values.label}.md`),
  `${header}${table}\n${regionTables}\n${stopTable}\n`,
);
console.log(`\n${table}\n${regionTables}\n${stopTable}`);

if (values.check) {
  const budgets = JSON.parse(await readFile("tests/perf/budgets.json", "utf8"));
  const failures = [];
  // A limit's key is a field of the median run, or a path into it
  // ("regions.opening.p99").
  const read = (object, key) =>
    key.split(".").reduce((value, part) => value?.[part], object);
  // A profile has ceilings of its own; without one, the lab's.
  const ceilings = values.profile
    ? (budgets.profiles?.[values.profile] ?? {})
    : budgets.scenarios;
  if (!Object.keys(ceilings).length)
    console.warn(`\nNo ceilings for profile ${values.profile} yet.`);
  for (const [scenario, limits] of Object.entries(ceilings)) {
    const measured = results[scenario]?.median;
    if (!measured) continue;
    for (const [key, limit] of Object.entries(limits))
      if ((read(measured, key) ?? 0) > limit)
        failures.push(`${scenario}.${key}: ${read(measured, key)} > ${limit}`);
  }
  if (failures.length) {
    console.error(`\nOver budget:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log("\nWithin budget.");
}
