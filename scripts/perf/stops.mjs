// Captures the desk at each stop of the journey, so a performance change can
// show it draws the same picture (or, for a deliberate visual change, the
// before and after for review).
//
//   node scripts/perf/stops.mjs capture <label> [--url http://localhost:3100]
//   node scripts/perf/stops.mjs compare <before> <after> [--min 45]
//
// Captures go to work/perf-stops/<label>/ (not committed). compare prints the
// PSNR of every pair and fails when a stop drops below --min dB. About sways
// on its own, so it is captured for review but never compared.
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: "string", default: "http://localhost:3100" },
    min: { type: "string", default: "45" },
  },
});
const [command, ...labels] = positionals;
const root = "work/perf-stops";
const sizes = [
  { name: "1440", viewport: { width: 1440, height: 900 } },
  { name: "2400", viewport: { width: 2400, height: 1000 } },
];
const stops = ["opening", "services", "experience", "explorer", "room"];
const args = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];

async function goTo(page, stop) {
  await page.evaluate((stop) => {
    const section = document.querySelector("[data-story]");
    const s = JSON.parse(section.dataset.story);
    const stage = document.querySelector("[data-journey-stage]");
    const at = (range, f) => range[0] + (range[1] - range[0]) * f;
    const distance = {
      opening: 0,
      services: s.chapters.services + 0.25,
      experience: s.chapters.experience + 0.3,
      explorer: at(s.macbook, 0.35),
      room: s.room,
    }[stop];
    scrollTo({
      top:
        scrollY +
        section.getBoundingClientRect().top +
        stage.offsetHeight * distance,
      behavior: "instant",
    });
  }, stop);
  await page.waitForTimeout(2200);
}

async function capture(label) {
  const browser = await chromium.launch({ headless: true, args });
  try {
    for (const locale of ["en", "tr"])
      for (const size of sizes) {
        const page = await browser.newPage({
          viewport: size.viewport,
          deviceScaleFactor: 1,
        });
        await page.goto(`${values.url}/${locale}`);
        await page.waitForSelector('[data-ready="true"]', { timeout: 60000 });
        const dir = `${root}/${label}/${locale}-${size.name}`;
        await mkdir(dir, { recursive: true });
        for (const stop of stops) {
          await goTo(page, stop);
          await page.screenshot({ path: `${dir}/${stop}.png` });
        }
        await page.evaluate(() =>
          document
            .getElementById("about")
            ?.scrollIntoView({ block: "start", behavior: "instant" }),
        );
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${dir}/about.png` });
        await page.close();
        console.log(`${label}: ${locale} ${size.name}`);
      }
  } finally {
    await browser.close();
  }
}

async function psnr(a, b) {
  const [left, right] = await Promise.all(
    [a, b].map((file) =>
      sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    ),
  );
  if (left.info.width !== right.info.width) return 0;
  let sum = 0;
  for (let i = 0; i < left.data.length; i++) {
    const d = left.data[i] - right.data[i];
    sum += d * d;
  }
  const mse = sum / left.data.length;
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}

async function compare(before, after) {
  const min = Number(values.min);
  let failed = false;
  for (const dir of await readdir(`${root}/${before}`))
    for (const stop of stops) {
      const value = await psnr(
        `${root}/${before}/${dir}/${stop}.png`,
        `${root}/${after}/${dir}/${stop}.png`,
      );
      const ok = value >= min;
      failed ||= !ok;
      console.log(
        `${ok ? "  " : "✗ "}${dir} ${stop}: ${value === Infinity ? "identical" : `${value.toFixed(1)} dB`}`,
      );
    }
  if (failed) {
    console.error(`\nSome stops changed (below ${min} dB).`);
    process.exit(1);
  }
}

if (command === "capture" && labels[0]) await capture(labels[0]);
else if (command === "compare" && labels.length === 2)
  await compare(labels[0], labels[1]);
else {
  console.error("Usage: stops.mjs capture <label> | compare <before> <after>");
  process.exit(2);
}
