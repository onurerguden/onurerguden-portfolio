import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const order = ["about", "services", "work", "experience", "contact"];

test("home sections follow the story order after the journey", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  const ids = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "#journey-content ~ * section[id], main > section[id]",
      ),
    ].map((section) => section.id),
  );
  expect(ids.filter((id) => order.includes(id))).toEqual(order);
  await expect(page.locator("main h1")).toHaveCount(1);
});

test("the Sections menu opens, navigates and closes from the keyboard", async ({
  page,
}) => {
  await page.goto("/en");
  const button = page.getByRole("button", { name: "Sections" });
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const menu = page.locator("#journey-sections-menu");
  await expect(menu.getByRole("link", { name: "What I do" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  await menu.getByRole("link", { name: "What I do" }).click();
  await expect(page).toHaveURL(/#services$/);
  await expect(menu).toBeHidden();
  // Headless Chromium draws the desk with software WebGL (SwiftShader), so
  // the smooth scroll past it can stall frames for a couple of seconds.
  await expect(page.locator("#services-title")).toBeInViewport({
    timeout: 15000,
  });
});

test("pausing motion is remembered across visits", async ({ page }) => {
  await page.goto("/tr");
  await page.getByRole("button", { name: "Bölümler" }).click();
  const toggle = page.getByRole("button", { name: "Hareketi duraklat" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-paused",
    "true",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-paused",
    "true",
  );
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`deep links land on their section (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/en#services");
    await page.waitForTimeout(1500);
    await expect(page.locator("#services-title")).toBeInViewport();
    await page.goto("/tr#contact");
    await page.waitForTimeout(1500);
    await expect(page.locator("#contact-title")).toBeInViewport();
  });
}

test("giant titles fit their width in both languages", async ({ page }) => {
  for (const locale of ["en", "tr"]) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const overflowing = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".giant-title")]
        .filter((title) => title.scrollWidth > title.clientWidth + 1)
        .map((title) => title.textContent),
    );
    expect(overflowing).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
  }
});

test("the nav docks after the journey on touch screens", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Fine pointers keep the top-edge reveal.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  const nav = page.getByRole("navigation", { name: "Journey sections" });
  await page.locator("#experience").scrollIntoViewIfNeeded();
  await expect(nav).toHaveAttribute("data-docked", "true");
  await page.evaluate(() => scrollBy({ top: -300, behavior: "instant" }));
  await expect(nav).toHaveAttribute("data-scroll-hidden", "false");
  await expect(nav.getByRole("button", { name: "Sections" })).toBeInViewport();
});

test("sections pass axe with scroll-linked reveals active", async ({
  page,
}) => {
  await page.goto("/tr");
  for (const id of order) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
  }
  expect(
    (
      await new AxeBuilder({ page })
        .include(order.map((id) => `#${id}`))
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`the home page hydrates without mismatches (${reducedMotion})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion });
    for (const locale of ["en", "tr"]) {
      await page.goto(`/${locale}`);
      await page.waitForTimeout(1200);
    }
    // React reports a server/client render difference as error #418/#423.
    expect(errors).toEqual([]);
  });
}
