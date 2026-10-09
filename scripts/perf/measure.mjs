// Measures how smooth the home page is for a visitor who starts scrolling as
// soon as it opens, in Chromium on this machine's real GPU.
//
//   node scripts/perf/measure.mjs [--url http://localhost:3100/en]
//     [--scenario first-visit,returning,cpu4,reduced] [--runs 3]
//     [--input measure,notch,trackpad] [--device "iPhone 13"]
//     [--trace] [--headed] [--seed 1] [--label baseline] [--out dir]
//     [--check]
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
    scenario: {
      type: "string",
      default: "first-visit,returning,cpu4,reduced",
    },
    input: { type: "string", default: "measure" },
    device: { type: "string" },
    runs: { type: "string", default: "3" },
    seed: { type: "string", default: "1" },
    trace: { type: "boolean", default: false },
    headed: { type: "boolean", default: false },
    label: { type: "string", default: "latest" },
    out: { type: "string", default: "docs/qa/perf" },
    check: { type: "boolean", default: false },
  },
});
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
const viewport = device?.viewport ?? { width: 1440, height: 900 };
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
  });
  // The scene's QA attributes (data-camera and the like) are written only
  // for QA, so a visitor's frames skip them.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("portfolio:qa", "1");
    } catch {
      // Storage can be blocked; the numbers that need it stay empty.
    }
  });
  await page.addInitScript({ path: inject });
  const cdp = await context.newCDPSession(page);
  if (scenario === "cpu4" && measured)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const tracing = values.trace && measured;
  if (tracing)
    await cdp.send("Tracing.start", {
      categories: traceCategories,
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
  const out = { ...middle };
  for (const [key, value] of Object.entries(middle))
    if (typeof value === "number")
      out[key] = quantile(
        runs.map((run) => run[key] ?? 0),
        0.5,
      );
  return out;
}

async function scenarioRun(scenario, input, run) {
  const profile = await mkdtemp(path.join(tmpdir(), "portfolio-perf-"));
  const context = await chromium.launchPersistentContext(profile, {
    headless: !values.headed,
    args,
    ...(device ?? { viewport, deviceScaleFactor: 2 }),
    reducedMotion: scenario === "reduced" ? "reduce" : "no-preference",
  });
  try {
    // Returning visitors have been here before: one full visit first.
    if (scenario === "returning" || scenario === "cpu4")
      await visit(context, scenario, input, false, run);
    const result = summarize(await visit(context, scenario, input, true, run));
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
  ["aboutGpuP95", "About GPU p95 (ms)"],
  ["aboutFramesInRoom", "About frames under the curtain"],
  ["cameraStepMax", "Camera's largest step in a frame (m)"],
  ["tinyScrolls", "Scrolls under 1 px"],
  ["dirtyStyleShare", "Scroll events with dirty style (%)"],
  ["dprReduced", "Desk lowered its resolution"],
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
const first = Object.values(results)[0]?.median;
const header = `# Performance: ${values.label}\n\n${new Date().toISOString().slice(0, 10)} · ${values.url} · ${first?.renderer ?? ""} · ${values.device ?? `${viewport.width}×${viewport.height} @2x`}${values.headed ? " · headed" : ""} · medians of ${values.runs} runs\n\n`;
await mkdir(values.out, { recursive: true });
await writeFile(
  path.join(values.out, `${values.label}.json`),
  JSON.stringify(
    { url: values.url, date: new Date().toISOString(), results },
    null,
    2,
  ) + "\n",
);
await writeFile(
  path.join(values.out, `${values.label}.md`),
  `${header}${table}\n${regionTables}\n`,
);
console.log(`\n${table}\n${regionTables}`);

if (values.check) {
  const budgets = JSON.parse(await readFile("tests/perf/budgets.json", "utf8"));
  const failures = [];
  // A limit's key is a field of the median run, or a path into it
  // ("regions.opening.p99").
  const read = (object, key) =>
    key.split(".").reduce((value, part) => value?.[part], object);
  for (const [scenario, limits] of Object.entries(budgets.scenarios)) {
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
