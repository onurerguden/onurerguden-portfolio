// Acceptance captures of the desk story and the rebuilt pages, as WebP in
// docs/qa/desk-story/. Run against a production server:
// DESK_REVIEW_URL=http://localhost:3200 node scripts/desk/capture-story.mjs
import { chromium, devices } from "playwright";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const base = process.env.DESK_REVIEW_URL || "http://localhost:3100";
const out = "docs/qa/desk-story/captures";
await mkdir(out, { recursive: true });

/** Scrolls to a story distance, or a chapter by name, and waits for it. */
async function story(page, target) {
  await page.waitForSelector("[data-story]", { timeout: 30000 });
  await page.waitForSelector('[data-ready="true"]', { timeout: 30000 });
  await page.evaluate((target) => {
    const section = document.querySelector("[data-story]");
    const s = JSON.parse(section.dataset.story);
    const stage = document.querySelector("[data-journey-stage]");
    const at = (range, f) => range[0] + (range[1] - range[0]) * f;
    const distance =
      typeof target === "number"
        ? target
        : {
            opening: 0,
            services: s.chapters.services + 0.25,
            experience: s.chapters.experience + 0.3,
            stack: s.chapters.stack + 0.25,
            explorer: at(s.macbook, 0.35),
            room: s.length,
          }[target];
    scrollTo({
      top:
        scrollY +
        section.getBoundingClientRect().top +
        stage.offsetHeight * distance,
      behavior: "instant",
    });
  }, target);
  // Let the camera, the balls and any takeover settle.
  await page.waitForTimeout(target === "stack" ? 4500 : 1800);
}

async function shot(page, name) {
  const png = await page.screenshot();
  await sharp(png).webp({ quality: 80 }).toFile(`${out}/${name}.webp`);
  console.log(name);
}

const browser = await chromium.launch();
try {
  const runs = [
    {
      name: "desktop",
      context: { viewport: { width: 1440, height: 900 } },
      locales: ["en", "tr"],
    },
    { name: "phone", context: devices["Pixel 7"], locales: ["en"] },
  ];
  for (const run of runs) {
    const context = await browser.newContext(run.context);
    // Headless Chromium renders WebGL in software; show the balls anyway.
    await context.addInitScript(() =>
      localStorage.setItem("portfolio:force-3d", "1"),
    );
    for (const locale of run.locales) {
      const page = await context.newPage();
      await page.goto(`${base}/${locale}`);
      for (const stop of [
        "opening",
        "services",
        "experience",
        "stack",
        "explorer",
        "room",
      ]) {
        await story(page, stop);
        await shot(page, `${run.name}-${locale}-${stop}`);
      }
      for (const id of ["about", "work", "research", "activity", "contact"]) {
        await page.evaluate((id) => {
          document
            .getElementById(`${id}-title`)
            ?.scrollIntoView({ behavior: "instant" });
        }, id);
        await page.waitForTimeout(900);
        await shot(page, `${run.name}-${locale}-${id}`);
      }
      for (const [name, path] of [
        ["archive", "/projects"],
        ["case-kuyumcum", "/projects/kuyumcum"],
        ["case-course-intelligence", "/projects/course-intelligence"],
        ["research-page", "/research"],
        ["not-found", "/no-such-page"],
      ]) {
        await page.goto(`${base}/${locale}${path}`);
        await page.waitForTimeout(1200);
        await shot(page, `${run.name}-${locale}-${name}`);
      }
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
