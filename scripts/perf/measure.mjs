// Measures how smooth the home page is for a visitor who starts scrolling as
// soon as it opens, in headless Chromium on this machine's real GPU.
//
//   node scripts/perf/measure.mjs [--url http://localhost:3100/en]
//     [--scenario first-visit,returning,cpu4,reduced] [--runs 3]
//     [--label baseline] [--check]
//
// Scenarios:
// - first-visit: a new browser profile and shaders the GPU has never seen
//   (inject.js changes every shader's source), as for a first-time visitor.
// - returning: the same profile after one full visit; HTTP and shader caches
//   are warm.
// - cpu4: returning, with the CPU slowed four times (a mid-range laptop).
// - reduced: reduced motion, the static flow (no WebGL).
//
// Results (medians over the runs) go to docs/qa/perf/<label>.{json,md}.
// --check compares them with tests/perf/budgets.json and fails when over.
// CI renders WebGL in software, so this runs on a GPU-backed machine only.
import { chromium } from "playwright";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3100/en" },
    scenario: {
      type: "string",
      default: "first-visit,returning,cpu4,reduced",
    },
    runs: { type: "string", default: "3" },
    label: { type: "string", default: "latest" },
    check: { type: "boolean", default: false },
  },
});
const inject = path.resolve("scripts/perf/inject.js");
const viewport = { width: 1440, height: 900 };
const args = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];

/** Wheel steps as a visitor flicks through the page, from 0.7 s after load. */
async function scrollThrough(page) {
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.waitForTimeout(700);
  const started = await page.evaluate(() => performance.now());
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(100);
    const end = await page.evaluate(
      () => scrollY + innerHeight >= document.documentElement.scrollHeight - 4,
    );
    if (end) break;
  }
  const ended = await page.evaluate(() => performance.now());
  await page.waitForTimeout(2000);
  return [started, ended];
}

async function visit(context, scenario, measured) {
  const page = await context.newPage();
  await page.addInitScript((config) => (window.__perfConfig = config), {
    bustShaderCache: scenario === "first-visit",
  });
  await page.addInitScript({ path: inject });
  const cdp = await context.newCDPSession(page);
  if (scenario === "cpu4" && measured)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(values.url, { waitUntil: "commit" });
  const [scrollStart, scrollEnd] = await scrollThrough(page);
  const result = measured
    ? await page.evaluate(() => {
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
        };
      })
    : null;
  await page.close();
  return result && { ...result, scrollStart, scrollEnd };
}

const quantile = (list, q) => {
  if (!list.length) return 0;
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
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
  return {
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
    scrollFrames: intervals.length,
    scrollP50: quantile(intervals, 0.5),
    scrollP95: quantile(intervals, 0.95),
    scrollOver50: intervals.filter((interval) => interval > 50).length,
    glBlocking: Math.round(
      Object.values(run.gl).reduce((sum, entry) => sum + entry.ms, 0),
    ),
    glBlockingAfterReady: Math.round(glAfterReady),
    programs: run.programs,
    contexts: run.contexts.length,
    scriptBytes: run.bytes.script || 0,
    modelBytes: run.bytes.model || 0,
    imageBytes: run.bytes.image || 0,
    milestones: run.milestones,
    renderer: run.contexts[0]?.renderer ?? "none",
    parallelCompile: run.contexts[0]?.parallelCompile ?? null,
    longFrames: loaf
      .filter((entry) => entry.duration > 100)
      .map((entry) => ({
        start: entry.start,
        duration: entry.duration,
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

async function scenarioRun(scenario) {
  const profile = await mkdtemp(path.join(tmpdir(), "portfolio-perf-"));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    args,
    viewport,
    deviceScaleFactor: 2,
    reducedMotion: scenario === "reduced" ? "reduce" : "no-preference",
  });
  try {
    // Returning visitors have been here before: one full visit first.
    if (scenario === "returning" || scenario === "cpu4")
      await visit(context, scenario, false);
    const run = summarize(await visit(context, scenario, true));
    if (
      scenario !== "reduced" &&
      /swiftshader|llvmpipe|software/i.test(run.renderer)
    )
      throw new Error(
        `Software WebGL (${run.renderer}): results would be meaningless`,
      );
    return run;
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
}

const results = {};
for (const scenario of values.scenario.split(",")) {
  const runs = [];
  for (let i = 0; i < Number(values.runs); i++) {
    runs.push(await scenarioRun(scenario));
    process.stdout.write(
      `${scenario} #${i + 1}: max frame ${runs.at(-1).maxLoaf} ms, ${runs.at(-1).loafsOver100} over 100 ms, scroll p95 ${runs.at(-1).scrollP95} ms\n`,
    );
  }
  results[scenario] = { median: median(runs), runs };
}

const columns = [
  ["maxLoaf", "Longest frame (ms)"],
  ["loafsOver100", "Frames > 100 ms"],
  ["loafsOver50", "Frames > 50 ms"],
  ["scrollP95", "Scroll p95 (ms)"],
  ["scrollOver50", "Scroll frames > 50 ms"],
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
  ...columns.map(
    ([key, label]) =>
      `| ${label} | ${names.map((name) => results[name].median[key] ?? "–").join(" | ")} |`,
  ),
].join("\n");
const first = Object.values(results)[0]?.median;
const header = `# Performance: ${values.label}\n\n${new Date().toISOString().slice(0, 10)} · ${values.url} · ${first?.renderer ?? ""} · 1440×900 @2x · medians of ${values.runs} runs\n\n`;
await mkdir("docs/qa/perf", { recursive: true });
await writeFile(
  `docs/qa/perf/${values.label}.json`,
  JSON.stringify(
    { url: values.url, date: new Date().toISOString(), results },
    null,
    2,
  ) + "\n",
);
await writeFile(`docs/qa/perf/${values.label}.md`, `${header}${table}\n`);
console.log(`\n${table}`);

if (values.check) {
  const budgets = JSON.parse(await readFile("tests/perf/budgets.json", "utf8"));
  const failures = [];
  for (const [scenario, limits] of Object.entries(budgets.scenarios)) {
    const measured = results[scenario]?.median;
    if (!measured) continue;
    for (const [key, limit] of Object.entries(limits))
      if ((measured[key] ?? 0) > limit)
        failures.push(`${scenario}.${key}: ${measured[key]} > ${limit}`);
  }
  if (failures.length) {
    console.error(`\nOver budget:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log("\nWithin budget.");
}
