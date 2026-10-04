import { test, expect } from "@playwright/test";

test("every project link is reachable and never hidden under a later card", async ({
  page,
}) => {
  await page.goto("/en");
  await page.locator("#work").scrollIntoViewIfNeeded();
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
