// What each part of a scene costs the GPU: draws the scene with one thing
// taken away at a time and times the frame, so a cut is chosen by what it
// saves rather than by its triangle count.
//
//   node scripts/perf/ablate.mjs [--url http://localhost:3100/en]
//     [--scene about,balls,desk] [--quality low|high] [--gpu 80]
//     [--viewport 1536x730@1.25] [--frames 120] [--label ablation] [--out dir]
//
// For each scene the page stops where it is on screen and offers it to this
// script (src/components/three/qa-scenes.ts, a QA visit only). Each variant
// is applied, drawn for --frames frames and undone:
//
// - every named part hidden in turn (About's objects; the desk's platform,
//   cosmic field and largest meshes);
// - each light switched off;
// - the materials' clearcoat and sheen switched off;
// - the drawing buffer at 0.75 of its size, which says how much of the frame
//   is paid per pixel rather than per triangle.
//
// The times are the GPU's own (EXT_disjoint_timer_query_webgl2, as measure.mjs
// reads them). --gpu adds the same per-fragment load as measure.mjs: with it
// the table says what a part's pixels cost a fill-rate-bound GPU; without
// it, what its shader costs here. Run it on an idle machine.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3100/en" },
    scene: { type: "string", default: "about,balls,desk" },
    quality: { type: "string" },
    gpu: { type: "string", default: "0" },
    viewport: { type: "string", default: "1536x730@1.25" },
    frames: { type: "string", default: "120" },
    label: { type: "string", default: "ablation" },
    out: { type: "string", default: "docs/qa/perf" },
  },
});
const match = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(values.viewport);
if (!match) throw new Error(`--viewport is WxH@dpr, not ${values.viewport}`);
const viewport = { width: Number(match[1]), height: Number(match[2]) };
const scale = Number(match[3] ?? 1);
const frames = Number(values.frames);
const gpuLoad = Number(values.gpu);
const inject = path.resolve("scripts/perf/inject.js");

/** Where each scene is on screen, as a distance along the story. */
function stopOf(scene) {
  const section = document.querySelector("[data-story]");
  const story = JSON.parse(section.dataset.story);
  const stage = document.querySelector("[data-journey-stage]");
  const about = document.getElementById("about");
  const top = (node) => node.getBoundingClientRect().top + scrollY;
  const at = (distance) => top(section) + stage.offsetHeight * distance;
  return {
    desk: at(story.room),
    balls: at(story.macbook[0]),
    about: Math.max(top(about), at(story.length)),
  }[scene];
}

/** The variants a scene can be drawn as; runs in the page. */
function variantsOf(id) {
  const { scene } = window.__portfolioScenes[id];
  const triangles = (object) => {
    let count = 0;
    object.traverse((child) => {
      const geometry = child.geometry;
      if (!geometry || !child.isMesh) return;
      const own = (geometry.index ?? geometry.attributes.position).count / 3;
      count += own * (child.isInstancedMesh ? child.count : 1);
    });
    return Math.round(count);
  };
  const variants = [{ kind: "none", name: "everything" }];
  // Named groups are the parts a visitor would name; on the desk, where the
  // model is one batch per material, the largest meshes stand in.
  const named = [];
  scene.traverse((object) => {
    if (!object.name || object === scene) return;
    if (id === "desk" && object.isMesh && triangles(object) < 1500) return;
    if (
      id === "desk" &&
      !object.isMesh &&
      !/platform|cosmic/i.test(object.name)
    )
      return;
    if (id !== "desk" && object.parent !== scene) return;
    if (object.isLight) return;
    named.push(object);
  });
  for (const object of named)
    variants.push({
      kind: "hide",
      name: `without ${object.name}`,
      target: object.name,
      triangles: triangles(object),
    });
  let light = 0;
  scene.traverse((object) => {
    if (object.isLight && !object.isAmbientLight)
      variants.push({
        kind: "light",
        name: `without ${object.type} ${light}`,
        index: light++,
      });
  });
  let physical = false;
  scene.traverse((object) => {
    for (const material of [object.material].flat())
      if (material?.isMeshPhysicalMaterial) physical = true;
  });
  if (physical) {
    variants.push({ kind: "material", name: "no clearcoat", set: "clearcoat" });
    variants.push({ kind: "material", name: "no sheen", set: "sheen" });
  }
  if (scene.environment)
    variants.push({ kind: "environment", name: "no environment light" });
  variants.push({
    kind: "pixels",
    name: "0.75 of the resolution",
    ratio: 0.75,
  });
  return variants;
}

/** Draws `frames` frames as `variant` and returns their GPU times; in the page. */
async function timeVariant({ id, label, variant, frames }) {
  const { scene, gl, invalidate } = window.__portfolioScenes[id];
  const undo = [];
  const lights = [];
  scene.traverse((object) => {
    if (object.isLight && !object.isAmbientLight) lights.push(object);
  });
  if (variant.kind === "hide") {
    scene.traverse((object) => {
      if (object.name !== variant.target || !object.visible) return;
      object.visible = false;
      undo.push(() => (object.visible = true));
    });
  } else if (variant.kind === "light") {
    const light = lights[variant.index];
    const was = light.intensity;
    // Off by its strength: hiding a light changes every lit program.
    light.intensity = 0;
    undo.push(() => (light.intensity = was));
  } else if (variant.kind === "material") {
    scene.traverse((object) => {
      for (const material of [object.material].flat()) {
        if (!material?.isMeshPhysicalMaterial || !material[variant.set])
          continue;
        const was = material[variant.set];
        material[variant.set] = 0;
        material.needsUpdate = true;
        undo.push(() => {
          material[variant.set] = was;
          material.needsUpdate = true;
        });
      }
    });
  } else if (variant.kind === "environment") {
    const was = scene.environment;
    scene.environment = null;
    undo.push(() => (scene.environment = was));
  } else if (variant.kind === "pixels") {
    const was = gl.getPixelRatio();
    gl.setPixelRatio(was * variant.ratio);
    undo.push(() => gl.setPixelRatio(was));
  }
  const draw = (count) =>
    new Promise((resolve) => {
      let drawn = 0;
      const tick = () => {
        invalidate();
        if (++drawn < count) requestAnimationFrame(tick);
        else setTimeout(resolve, 200);
      };
      requestAnimationFrame(tick);
    });
  // New programs link and caches settle before the frames that count.
  await draw(30);
  const from = performance.now();
  await draw(frames);
  const times = (window.__perf.gpu[label] || [])
    .filter(([start]) => start >= from)
    .map(([, ms]) => ms)
    .sort((a, b) => a - b);
  const canvas = gl.domElement;
  const result = {
    samples: times.length,
    p50: times[Math.floor(times.length * 0.5)] ?? null,
    p90: times[Math.floor(times.length * 0.9)] ?? null,
    calls: gl.info.render.calls,
    triangles: gl.info.render.triangles,
    pixels: canvas.width * canvas.height,
  };
  for (const step of undo) step();
  await draw(10);
  return result;
}

const round = (n) => (n === null ? null : Math.round(n * 100) / 100);
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const results = {};
try {
  for (const id of values.scene.split(",")) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: scale,
    });
    const page = await context.newPage();
    await page.addInitScript((config) => (window.__perfConfig = config), {
      gpu: true,
      gpuLoad,
    });
    await page.addInitScript((tier) => {
      localStorage.setItem("portfolio:qa", "1");
      if (tier) localStorage.setItem("portfolio:quality", tier);
    }, values.quality ?? null);
    await page.addInitScript({ path: inject });
    await page.goto(values.url);
    await page.waitForSelector('[data-ready="true"]', { timeout: 60000 });
    await page.waitForSelector("[data-story]", { timeout: 20000 });
    const top = await page.evaluate(`(${stopOf.toString()})("${id}")`);
    await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), top);
    // The page's own name for the scene: the balls are the "desk-stack" stage.
    const key = id === "balls" ? "desk-stack" : id;
    await page.waitForFunction(
      (key) => Boolean(window.__portfolioScenes?.[key]),
      key,
      { timeout: 30000 },
    );
    // The scene's mount, warm-up and first frames; the balls' drop.
    await page.waitForTimeout(4000);
    const variants = await page.evaluate(
      `(${variantsOf.toString()})("${key}")`,
    );
    const rows = [];
    for (const variant of variants) {
      const timed = await page.evaluate(
        `(${timeVariant.toString()})(${JSON.stringify({ id: key, label: id, variant, frames })})`,
      );
      rows.push({ ...variant, ...timed });
      process.stdout.write(
        `${id}: ${variant.name}: ${round(timed.p50)} ms (${timed.samples} frames)\n`,
      );
    }
    results[id] = rows;
    await context.close();
  }
} finally {
  await browser.close();
}

const tables = Object.entries(results)
  .map(([id, rows]) => {
    const base = rows[0];
    return [
      `\n### ${id}\n`,
      `Everything: ${round(base.p50)} ms per frame (p90 ${round(base.p90)}), ${base.calls} draw calls, ${base.triangles} triangles, ${(base.pixels / 1e6).toFixed(2)} MP.\n`,
      "| Drawn | GPU p50 (ms) | Saved (ms) | Saved (%) | Triangles it holds | Draw calls |",
      "|---|---|---|---|---|---|",
      ...rows
        .slice(1)
        .map((row) => ({ ...row, saved: (base.p50 ?? 0) - (row.p50 ?? 0) }))
        .sort((a, b) => b.saved - a.saved)
        .map(
          (row) =>
            `| ${row.name} | ${round(row.p50)} | ${round(row.saved)} | ${
              base.p50 ? Math.round((100 * row.saved) / base.p50) : "–"
            } | ${row.triangles ?? "–"} | ${row.calls} |`,
        ),
    ].join("\n");
  })
  .join("\n");
const header = `# Ablation: ${values.label}\n\n${new Date().toISOString().slice(0, 10)} · ${values.url} · ${viewport.width}×${viewport.height} @${scale}x${values.quality ? ` · ${values.quality} tier` : ""}${gpuLoad ? ` · GPU load ${gpuLoad}` : ""} · ${frames} frames per variant\n\nEach row draws the scene with one thing taken away and says what the GPU saved. Rows within about 0.1 ms of each other are noise.\n`;
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
  `${header}${tables}\n`,
);
console.log(`${header}${tables}`);
