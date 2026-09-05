import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const paths = [
  "",
  "/projects",
  "/research",
  "/projects/kuyumcum",
  "/projects/water-safety",
  "/projects/course-intelligence",
];
for (const locale of ["en", "tr"]) {
  test(`${locale}: every editorial route is readable and localized`, async ({
    page,
  }) => {
    for (const path of paths) {
      const response = await page.goto(`/${locale}${path}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      const links = await page
        .locator('link[rel="alternate"][hreflang]')
        .count();
      expect(links).toBeGreaterThanOrEqual(2);
    }
  });
  test(`${locale}: keyboard, images and accessible content`, async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    // Mobile WebKit does not emulate desktop full-keyboard-access preferences.
    // Desktop exercises real tab order; mobile exercises focus and activation.
    if (isMobile) await page.locator(".skip-link").focus();
    else await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await page.locator("#work").scrollIntoViewIfNeeded();
    for (const image of await page.locator(".phone-pair img").all()) {
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}
test("language switching preserves the case study and research is reachable", async ({
  page,
}) => {
  await page.goto("/en/projects/kuyumcum");
  await page.getByRole("link", { name: "Türkçeye geç" }).click();
  await expect(page).toHaveURL(/\/tr\/projects\/kuyumcum$/);
  await page.getByRole("link", { name: "Araştırma", exact: true }).click();
  await expect(page).toHaveURL(/\/tr\/research$/);
  await expect(page.getByText("Kabul edildi", { exact: false })).toBeVisible();
});
test("reduced motion keeps the HTML explanation without WebGL", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await expect(page.getByText("From data to a working system.")).toBeVisible();
  await page.waitForTimeout(2200);
  await expect(page.locator("canvas")).toHaveCount(0);
});
test("3D canvas is decorative, within budget and safely loses context", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Headless WebKit may not provide WebGL; fallback is audited separately.",
  );
  await page.goto("/en");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, 100));
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  await expect(canvas).toHaveAttribute("tabindex", "-1");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-draw-calls")))
    .toBeGreaterThan(0);
  expect(
    Number(await canvas.getAttribute("data-draw-calls")),
  ).toBeLessThanOrEqual(50);
  expect(
    Number(await canvas.getAttribute("data-triangles")),
  ).toBeLessThanOrEqual(100000);
  await canvas.evaluate((c) =>
    c.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
  );
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByText("From data to a working system.")).toBeVisible();
});
test("all internal navigation resolves without broken links", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const targets = new Set<string>();
  for (const path of paths) {
    await page.goto(`/en${path}`);
    for (const href of await page
      .locator('a[href^="/"]')
      .evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
      targets.add(href.split("#")[0]);
    }
  }
  for (const target of targets) {
    expect((await request.get(target)).status(), target).toBeLessThan(400);
  }
  expect((await request.get("/en/projects/taskfoo")).status()).toBe(404);
  expect((await request.get("/fr")).status()).toBe(404);
});
test("API endpoints fail closed without credentials", async ({ request }) => {
  expect((await request.get("/api/cron/github")).status()).toBe(401);
  expect(
    (await request.post("/api/github/webhook", { data: {} })).status(),
  ).toBe(503);
});
