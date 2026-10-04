import { test, expect, type Page } from "@playwright/test";
import { go, story, ci } from "./helpers";

async function hydrated(page: Page) {
  // The motion store marks <html> once the page has hydrated.
  await page.waitForFunction(
    () => document.documentElement.dataset.motionPaused !== undefined,
  );
}

test("Bliss parts as the camera reaches the MacBook and rests at the desktop", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  const s = await story(page);
  const skyShift = () =>
    page.evaluate(() => {
      const sky = document.querySelector(
        '[data-screen="2"] [data-xp] picture',
      ) as HTMLElement;
      return new DOMMatrixReadOnly(getComputedStyle(sky).transform).m42;
    });
  await go(page, s.chapters.stack + 0.2);
  expect(Math.abs(await skyShift())).toBeLessThan(1);
  await go(page, s.chapters.stack - 0.5);
  await expect.poll(skyShift).toBeLessThan(-4);
});

test("reduced motion shows only the original photograph", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/images/bliss/")) requested.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await hydrated(page);
  await page.locator("#stack").scrollIntoViewIfNeeded();
  await expect
    .poll(() => requested.filter((url) => url.includes("/original-")).length)
    .toBeGreaterThan(0);
  expect(requested.filter((url) => !url.includes("/original-"))).toEqual([]);
});

test("the start menu works from the keyboard", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tr");
  await hydrated(page);
  await page.locator("#stack").scrollIntoViewIfNeeded();
  const start = page.getByRole("button", { name: "start" });
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(start).toHaveAttribute("aria-expanded", "true");
  const menu = page.getByRole("menu", { name: "Bir bölüme git" });
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  // Both columns are one list for the arrow keys.
  await page.keyboard.press("ArrowUp");
  await expect(
    menu.getByRole("menuitem", { name: "CV’mi iste" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(start).toBeFocused();
  await start.click();
  await menu.getByRole("menuitem", { name: "Ne yapıyorum" }).click();
  await expect(page).toHaveURL(/#services$/);
});

test("every technology is listed in text with where it was used", async ({
  page,
}) => {
  await page.goto("/en");
  const explorer = page.locator("[data-explorer]");
  await expect(explorer.locator("h4 + ul li")).toHaveCount(41);
  await expect(
    explorer.getByRole("heading", {
      name: "All technologies (41)",
      includeHidden: true,
    }),
  ).toBeAttached();
  const python = explorer.locator("li", { hasText: "Python" }).first();
  // The panel may still be hidden while the desk loads; count the links.
  await expect(python.locator("a")).toHaveCount(3);
  // Nothing is claimed for a tool without a public example.
  await expect(
    explorer.locator("li", { hasText: "Figma" }).locator("a"),
  ).toHaveCount(0);
});
