import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  ci,
  forceSectionScenes,
  go,
  journeyCanvas,
  stageCanvas,
  story,
} from "./helpers";

/** What the visitor would click at each point across the middle row. */
async function hits(page: Page, xs: number[]) {
  return page.evaluate((fractions) => {
    return fractions.map((x) => {
      const node = document.elementFromPoint(innerWidth * x, innerHeight * 0.5);
      return node?.closest("[data-journey-stage]")
        ? "desk"
        : node?.closest("#about")
          ? "about"
          : "other";
    });
  }, xs);
}

test.describe("the paper curtain", () => {
  test.skip(
    ({ browserName, isMobile }) => browserName === "webkit" || isMobile,
    "Wide screens with WebGL2 run the curtain; phones keep plain flow.",
  );

  test("draws the desk aside onto About and back again", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("[data-ready]")).toHaveAttribute(
      "data-ready",
      "true",
      { timeout: ci(20000) },
    );
    const s = await story(page);
    expect(s.exit).not.toBeNull();
    const [start, end] = s.exit!;
    // The final hold: the desk fills the middle, About shows at the edges.
    await go(page, start);
    expect(await hits(page, [0.01, 0.5, 0.99])).toEqual([
      "about",
      "desk",
      "about",
    ]);
    // Halfway, the paper covers a quarter of each side.
    await go(page, start + (end - start) / 2);
    expect(await hits(page, [0.15, 0.5, 0.85])).toEqual([
      "about",
      "desk",
      "about",
    ]);
    // At the end only About is left, and the desk has stopped drawing. The
    // story's distance stops at its end, so a step past it lands exactly
    // there whatever the scroll position rounds to.
    await go(page, end + 0.03);
    expect(await hits(page, [0.05, 0.3, 0.5, 0.7, 0.95])).toEqual(
      Array(5).fill("about"),
    );
    await expect(journeyCanvas(page)).toHaveAttribute("data-active", "false");
    const about = await page
      .locator("#about > section")
      .evaluate((node) => Math.round(node.getBoundingClientRect().top));
    expect(Math.abs(about)).toBe(0);
    // Reversing replays it.
    await go(page, start);
    expect(await hits(page, [0.5])).toEqual(["desk"]);
    await expect(journeyCanvas(page)).toHaveAttribute("data-active", "true");
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });

  test("About draws only once the curtain opens", async ({ page }) => {
    await forceSectionScenes(page);
    await page.goto("/en");
    await expect(page.locator("[data-ready]")).toHaveAttribute(
      "data-ready",
      "true",
      { timeout: ci(20000) },
    );
    const s = await story(page);
    // Approaching the final view, About is already in place beneath the
    // desk: it mounts and warms up, but nothing of it shows.
    await go(page, s.room - 0.3);
    const about = stageCanvas(page, "about");
    await expect(page.locator("[data-about-stage]")).toHaveAttribute(
      "data-stage-state",
      "live",
      { timeout: ci(30000) },
    );
    await expect(about).toHaveAttribute("data-stage-active", "false");
    const frames = Number(await about.getAttribute("data-stage-frames"));
    await page.waitForTimeout(500);
    expect(Number(await about.getAttribute("data-stage-frames"))).toBe(frames);
    // The final hold draws the desk's sides back onto About.
    await go(page, s.exit![0]);
    await expect(about).toHaveAttribute("data-stage-active", "true");
    await expect
      .poll(async () => Number(await about.getAttribute("data-stage-frames")))
      .toBeGreaterThan(frames);
  });

  for (const locale of ["en", "tr"]) {
    test(`${locale}: links and the skip link land on About with the desk drawn aside`, async ({
      page,
    }) => {
      await page.goto(`/${locale}#about`);
      await expect(page.locator("[data-story]")).toHaveCount(1, {
        timeout: ci(20000),
      });
      await expect
        .poll(() => hits(page, [0.1, 0.5, 0.9]), { timeout: ci(15000) })
        .toEqual(["about", "about", "about"]);
      await page.goto(`/${locale}`);
      await expect(page.locator("[data-story]")).toHaveCount(1, {
        timeout: ci(20000),
      });
      await page
        .getByRole("link", {
          name: locale === "en" ? "Skip the desk tour" : "Masa turunu geç",
        })
        .focus();
      await page.keyboard.press("Enter");
      await expect
        .poll(() => hits(page, [0.1, 0.5, 0.9]), { timeout: ci(15000) })
        .toEqual(["about", "about", "about"]);
    });
  }

  test("the static view has no curtain", async ({ page }) => {
    await page.addInitScript(() =>
      sessionStorage.setItem("portfolio:desk-static", "true"),
    );
    await page.goto("/en");
    await expect(page.locator("[data-journey-curtain]")).toHaveAttribute(
      "data-journey-curtain",
      "off",
    );
    await expect(page.locator("#about")).toHaveCSS("margin-top", "0px");
  });
});
