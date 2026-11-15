import { test, expect } from "@playwright/test";
import { reach } from "./helpers";

test("every project link is reachable and never hidden under a later card", async ({
  page,
}) => {
  await page.goto("/en");
  await reach(page, "work");
  const links = page.locator("#work a");
  const count = await links.count();
  expect(count).toBeGreaterThanOrEqual(10);
  // Walk the cards backwards too: Shift+Tab is where sticky cards hide focus.
  await links.last().focus();
  for (let i = 0; i < count; i++) {
    const covered = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      const rect = active.getBoundingClientRect();
      const top = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + Math.min(rect.height / 2, 12),
      );
      return top && !active.contains(top) && !top.contains(active)
        ? active.textContent
        : null;
    });
    expect(covered).toBeNull();
    await page.keyboard.press("Shift+Tab");
    const inside = await page.evaluate(
      () => !!document.activeElement?.closest("#work"),
    );
    if (!inside) break;
  }
});

test("cards stack on wide screens and read in normal flow otherwise", async ({
  page,
  isMobile,
}) => {
  await page.goto("/en");
  const slot = page.locator("[data-stack-card]").first();
  await expect(slot).toHaveCSS("position", isMobile ? "static" : "sticky");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(slot).toHaveCSS("position", "static");
});

test("cards show real media with text alternatives in both languages", async ({
  page,
}) => {
  for (const locale of ["en", "tr"]) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const images = page.locator("#work img");
    // Kuyumcum's two phones, two water-safety figures, GymRap's three
    // emails and the archive's figure.
    await expect(images).toHaveCount(8);
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveAttribute("alt", /\S{3,}/);
      await expect
        .poll(() =>
          image.evaluate((node: HTMLImageElement) => node.naturalWidth),
        )
        .toBeGreaterThan(0);
    }
    await expect(
      page
        .getByRole("link", {
          name: locale === "en" ? /source code/i : /kaynak kodu/i,
        })
        .first(),
    ).toBeAttached();
  }
});

test("archive entries link to their anchors on the projects page", async ({
  page,
}) => {
  await page.goto("/en");
  await page.locator('#work a[href="/en/projects#taskfoo"]').click();
  await expect(page).toHaveURL(/\/en\/projects#taskfoo$/);
  await expect(page.locator("#taskfoo")).toBeInViewport();
});

// Short laptop screens cut the pinned cards' bottoms off (a 1536 × 730
// browser window, November 15): every card must fit where it pins.
const heights = [
  { width: 1280, height: 600 },
  { width: 1366, height: 650 },
  { width: 1536, height: 730 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1300 },
];
for (const locale of ["en", "tr"] as const) {
  test(`every pinned card fits the window, ${locale}`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Phones read the cards in normal flow.");
    await page.goto(`/${locale}`);
    for (const viewport of heights) {
      await page.setViewportSize(viewport);
      const size = `${viewport.width}×${viewport.height}`;
      const slots = page.locator("[data-stack-card]");
      const count = await slots.count();
      for (let i = 0; i < count; i++) {
        // Scroll the card's own marker to the place it pins at.
        const fit = await slots.nth(i).evaluate((slot) => {
          const marker = slot.previousElementSibling as HTMLElement;
          const pin = parseFloat(getComputedStyle(slot).top) || 0;
          // A grid track never goes below zero, so the slot starts one row
          // gap below its marker whatever the marker's margin.
          const gap = parseFloat(getComputedStyle(slot.parentElement!).rowGap);
          const top = marker.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: top + gap - pin + 1, behavior: "instant" });
          const card = slot.querySelector("article")!.getBoundingClientRect();
          const pinned = Math.abs(slot.getBoundingClientRect().top - pin) < 2;
          const last = [...slot.querySelectorAll("article a")].at(-1)!;
          const end = last.getBoundingClientRect();
          return {
            sticky: getComputedStyle(slot).position === "sticky",
            pinned,
            bottom: Math.round(card.bottom),
            lastBottom: Math.round(end.bottom),
            height: innerHeight,
          };
        });
        if (!fit.sticky) continue;
        expect(fit.pinned, `${size} card ${i + 1} pinned`).toBe(true);
        expect(fit.bottom, `${size} card ${i + 1}`).toBeLessThanOrEqual(
          fit.height,
        );
        // The case-study tile (or the archive's last entry) is whole.
        expect(fit.lastBottom, `${size} card ${i + 1}`).toBeLessThanOrEqual(
          fit.height,
        );
      }
    }
  });
}
