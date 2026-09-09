import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function go(page: Page, d: number) {
  await page.evaluate((distance) => {
    const section = document.querySelector("[data-enhanced]") as HTMLElement;
    const stage = document.querySelector("[data-journey-stage]") as HTMLElement;
    window.scrollTo({
      top:
        scrollY +
        section.getBoundingClientRect().top +
        ((section.offsetHeight - stage.offsetHeight) * distance) / 7.5,
      behavior: "instant",
    });
  }, d);
  await expect
    .poll(async () =>
      Number(await page.locator("canvas").getAttribute("data-distance")),
    )
    .toBeCloseTo(d, 1);
}
for (const locale of ["en", "tr"])
  test(`${locale}: journey static content is accessible and has no model in reduced motion`, async ({
    page,
  }) => {
    const models: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("onur-desk.glb")) models.push(r.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/lab/desk/journey`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("[data-enhanced]")).toHaveAttribute(
      "data-enhanced",
      "false",
    );
    await expect(page.locator("#desk-story-0")).toBeVisible();
    expect(models).toEqual([]);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
test("scroll separates reading from camera travel, reverses, focuses links and exits", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Headless WebKit has no reliable WebGL2; static paths are covered.",
  );
  await page.goto("/tr/lab/desk/journey");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  const canvas = page.locator("canvas");
  await go(page, 1.4);
  const camera = await canvas.getAttribute("data-camera");
  await go(page, 2.6);
  expect(await canvas.getAttribute("data-camera")).toBe(camera);
  expect(
    Number(await page.locator('[data-screen="0"]').getAttribute("data-page")),
  ).toBeGreaterThan(1);
  await go(page, 1.4);
  expect(await canvas.getAttribute("data-camera")).toBe(camera);
  await go(page, 4.5);
  expect(await canvas.getAttribute("data-camera")).not.toBe(camera);
  await page.locator('[data-screen="2"] a').last().focus();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-distance")))
    .toBeGreaterThan(6.6);
  await expect(page.locator('[data-screen="2"] a').last()).toBeInViewport();
  expect(
    Number(await canvas.getAttribute("data-draw-calls")),
  ).toBeLessThanOrEqual(50);
  expect(
    Number(await canvas.getAttribute("data-triangles")),
  ).toBeLessThanOrEqual(100000);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("link", { name: "İçeriğe geç", exact: true })
    .last()
    .click();
  await expect(page.locator("#journey-content")).toBeInViewport();
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
  );
  await page.waitForTimeout(1000);
  const frames = await canvas.getAttribute("data-frames");
  await page.waitForTimeout(400);
  expect(await canvas.getAttribute("data-frames")).toBe(frames);
});
test("failed model collapses the pinned journey and preserves content", async ({
  page,
}) => {
  await page.route("**/models/desk/onur-desk.glb*", (route) => route.abort());
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("[data-enhanced]")).toHaveAttribute(
    "data-enhanced",
    "false",
    { timeout: 20000 },
  );
  await expect(page.locator("#desk-story-0")).toBeVisible();
  await expect(page.locator("#journey-content")).toBeAttached();
});
test("without JavaScript the complete story and continuation are present", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("#desk-story-0")).toBeVisible();
  await expect(page.locator("#journey-content")).toBeAttached();
  await expect(page.locator("canvas")).toHaveCount(0);
  await context.close();
});

test("late loading keeps the current scroll position; context loss restores normal flow", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/models/desk/onur-desk.glb*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("[data-enhanced]")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  await expect(page.locator("[data-journey-stage] img")).toBeVisible();
  await page.evaluate(() => {
    const s = document.querySelector("[data-enhanced]") as HTMLElement,
      v = document.querySelector("[data-journey-stage]") as HTMLElement;
    scrollTo({
      top:
        scrollY +
        s.getBoundingClientRect().top +
        ((s.offsetHeight - v.offsetHeight) * 4.2) / 7.5,
      behavior: "instant",
    });
  });
  release();
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  await expect
    .poll(async () =>
      Number(await page.locator("canvas").getAttribute("data-distance")),
    )
    .toBeCloseTo(4.2, 1);
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.locator("[data-enhanced]")).toHaveAttribute(
    "data-enhanced",
    "false",
  );
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("#desk-story-1")).toBeVisible();
});

test("narrow and zoom-equivalent viewports preserve screen links and readable type", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  for (const [screen, d] of [
    [0, 1.4],
    [1, 4.1],
    [2, 6.1],
  ]) {
    await go(page, d);
    const text = page
      .locator(`[data-screen="${screen}"] article`)
      .first()
      .locator("p");
    const font = await text.evaluate((p) => {
      const actual = p.getBoundingClientRect().height;
      return (
        (parseFloat(getComputedStyle(p).fontSize) * actual) /
        (p as HTMLElement).offsetHeight
      );
    });
    expect(font).toBeGreaterThanOrEqual(16);
    await expect(
      page.locator(`[data-screen="${screen}"] a`).first(),
    ).toBeInViewport();
  }
  await page.setViewportSize({ width: 640, height: 400 });
  await go(page, 4.1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Skip to work" }).click();
  await expect(page.locator("#journey-content")).toBeInViewport();
});
