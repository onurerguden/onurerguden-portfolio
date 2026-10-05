// Captures the final-polish QA set into docs/qa/final-polish/captures:
// the scroll hint, the portrait close-up, About, the section sheets, the paper
// curtain, the new project cards and the research teaser, desktop and phone.
// Run against a production server:
// QA_URL=http://localhost:3400 node scripts/qa/final-polish.mjs
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const base = process.env.QA_URL || "http://localhost:3100";
const out = "docs/qa/final-polish/captures";
await mkdir(out, { recursive: true });
const browser = await chromium.launch();

async function save(page, name, locator) {
  const png = locator ? await locator.screenshot() : await page.screenshot();
  await sharp(png).webp({ quality: 80 }).toFile(`${out}/${name}.webp`);
  console.log(name);
}

async function toDistance(page, d) {
  await page.evaluate((distance) => {
    const section = document.querySelector("[data-enhanced]");
    scrollTo({
      top:
        scrollY + section.getBoundingClientRect().top + distance * innerHeight,
      behavior: "instant",
    });
  }, d);
  await page.waitForTimeout(1500);
}

try {
  // The desk, desktop: opening hint, portrait close-up, final view, curtain.
  for (const locale of ["en", "tr"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(`${base}/${locale}`);
    await page.waitForSelector('[data-ready="true"]', { timeout: 60000 });
    await page.waitForTimeout(800);
    await save(page, `${locale}-1440-opening`);
    const story = JSON.parse(
      await page.locator("[data-story]").getAttribute("data-story"),
    );
    await toDistance(page, story.portrait[0] + 0.05);
    await save(page, `${locale}-1440-portrait`);
    await toDistance(page, story.room + 0.2);
    await save(page, `${locale}-1440-final-view`);
    const [start, end] = story.exit;
    await toDistance(page, start + (end - start) * 0.4);
    await save(page, `${locale}-1440-curtain`);
    await toDistance(page, end);
    await save(page, `${locale}-1440-about`);
    await page.close();
  }
  // The sheets and the new content, in the static view.
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.addInitScript(() =>
    sessionStorage.setItem("portfolio:desk-static", "true"),
  );
  await page.goto(`${base}/en`);
  await page.waitForTimeout(1500);
  for (const [name, fraction] of [
    ["sheet-hold", 0.3],
    ["sheet-cover", 0.9],
  ]) {
    await page.evaluate((f) => {
      const about = document.getElementById("about");
      scrollTo({
        top: about.getBoundingClientRect().top + scrollY + innerHeight * f,
        behavior: "instant",
      });
    }, fraction);
    await page.waitForTimeout(600);
    await save(page, `en-1440-${name}`);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForTimeout(1500);
  for (const [name, selector] of [
    ["card-gymrap", "[data-stack-card] >> nth=3"],
    ["card-archive", "[data-stack-card] >> nth=4"],
    ["research", "#research"],
    ["contact", "#contact"],
  ]) {
    const target = page.locator(selector).first();
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await save(page, `en-1440-${name}`, target);
  }
  await page.close();
  // Phone: the opening hint and About in Turkish.
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await phone.goto(`${base}/tr`);
  await phone.waitForTimeout(3000);
  await save(phone, "tr-390-opening");
  await phone.evaluate(() =>
    document
      .getElementById("about")
      .scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await phone.waitForTimeout(3000);
  await save(phone, "tr-390-about");
  await phone.close();
} finally {
  await browser.close();
}
