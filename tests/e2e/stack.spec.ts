import { test, expect } from "@playwright/test";

/** Scrolls so the pinned stage is at the middle of its travel (--s = 0). */
async function centreStack(page: import("@playwright/test").Page) {
  // The motion store marks <html> once the page has hydrated.
  await page.waitForFunction(
    () => document.documentElement.dataset.motionPaused !== undefined,
  );
  await page.evaluate(() => {
    const track = document.querySelector("#stack > div") as HTMLElement;
    const rect = track.getBoundingClientRect();
    scrollTo({
      top: scrollY + rect.top + rect.height / 2 - innerHeight / 2,
      behavior: "instant",
    });
  });
  await page.waitForTimeout(300);
}

test("the Bliss layers line up exactly at rest and separate with scroll", async ({
  page,
}) => {
  await page.goto("/en");
  await centreStack(page);
  const skyShift = () =>
    page.evaluate(() => {
      const sky = document.querySelector("#stack picture") as HTMLElement;
      return new DOMMatrixReadOnly(getComputedStyle(sky).transform).m42;
    });
  expect(Math.abs(await skyShift())).toBeLessThan(1);
  await page.evaluate(() =>
    scrollBy({ top: innerHeight * 0.6, behavior: "instant" }),
  );
  await expect.poll(skyShift).toBeGreaterThan(4);
});

test("reduced motion shows only the original photograph", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/images/bliss/")) requested.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await page.locator("#stack").scrollIntoViewIfNeeded();
  await centreStack(page);
  await expect
    .poll(() => requested.filter((url) => url.includes("/original-")).length)
    .toBeGreaterThan(0);
  expect(requested.filter((url) => !url.includes("/original-"))).toEqual([]);
});

test("the start menu works from the keyboard", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tr");
  await centreStack(page);
  const start = page.getByRole("button", { name: "start" });
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(start).toHaveAttribute("aria-expanded", "true");
  const menu = page.getByRole("menu", { name: "Bir bölüme git" });
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(menu.getByRole("menuitem").last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(start).toBeFocused();
  await start.click();
  await menu.getByRole("menuitem", { name: "Ne yapıyorum" }).click();
  await expect(page).toHaveURL(/#services$/);
});

test("every technology is listed in text", async ({ page }) => {
  await page.goto("/en");
  const list = page.locator("#stack h4 + ul li");
  await expect(list).toHaveCount(32);
  await expect(page.getByText("All technologies (32)")).toBeAttached();
});
