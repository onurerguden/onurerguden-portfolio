import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { journeyLength } from "../../src/lib/desk-journey";
async function go(page: Page, d: number) {
  await page.evaluate(
    ({ distance, length }) => {
      const section = document.querySelector("[data-enhanced]") as HTMLElement;
      const stage = document.querySelector(
        "[data-journey-stage]",
      ) as HTMLElement;
      window.scrollTo({
        top:
          scrollY +
          section.getBoundingClientRect().top +
          ((section.offsetHeight - stage.offsetHeight) * distance) / length,
        behavior: "instant",
      });
    },
    { distance: d, length: journeyLength },
  );
  await expect
    .poll(
      async () =>
        Number(await page.locator("canvas").getAttribute("data-distance")),
      { timeout: 20000 },
    )
    .toBeCloseTo(d, 1);
}
test("opening portrait stays sharp until scroll and returns on reverse", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  await page.goto("/tr");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  const opening = page.locator("[data-opening-poster]");
  await expect(opening).toHaveAttribute("data-hidden", "false");
  const image = opening.locator("img");
  await expect(image).toHaveAttribute(
    "src",
    "/images/avatar/onur-head-v3.webp",
  );
  const resolution = await image.evaluate((element) => {
    const portrait = element as HTMLImageElement;
    return {
      natural: portrait.naturalWidth,
      displayed: portrait.getBoundingClientRect().width,
    };
  });
  expect(resolution.natural).toBeGreaterThanOrEqual(resolution.displayed);
  await go(page, 0.18);
  await expect(opening).toHaveAttribute("data-hidden", "true");
  await go(page, 0);
  await expect(opening).toHaveAttribute("data-hidden", "false");
});
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
  await go(page, 2.1);
  const camera = await canvas.getAttribute("data-camera");
  await go(page, 3.6);
  expect(await canvas.getAttribute("data-camera")).toBe(camera);
  expect(
    Number(await page.locator('[data-screen="0"]').getAttribute("data-page")),
  ).toBeGreaterThan(1);
  await go(page, 2.1);
  expect(await canvas.getAttribute("data-camera")).toBe(camera);
  await go(page, 5.1);
  expect(await canvas.getAttribute("data-camera")).not.toBe(camera);
  await page.locator('[data-screen="2"] a').last().focus();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-distance")))
    .toBeGreaterThan(5.6);
  await expect(page.locator('[data-screen="2"] a').last()).toBeInViewport();
  expect(
    Number(await canvas.getAttribute("data-draw-calls")),
  ).toBeLessThanOrEqual(130);
  expect(
    Number(await canvas.getAttribute("data-triangles")),
  ).toBeLessThanOrEqual(210000);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const skip = page
    .getByRole("link", { name: "İçeriğe geç", exact: true })
    .last();
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#journey-content")).toBeInViewport();
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
  );
  await expect(canvas).toHaveAttribute("data-active", "false");
  await page.waitForTimeout(200);
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
  await expect(page.locator("[data-journey-stage] > img")).toHaveCount(0);
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "false",
  );
  await page.evaluate(
    ({ distance, length }) => {
      const s = document.querySelector("[data-enhanced]") as HTMLElement,
        v = document.querySelector("[data-journey-stage]") as HTMLElement;
      scrollTo({
        top:
          scrollY +
          s.getBoundingClientRect().top +
          ((s.offsetHeight - v.offsetHeight) * distance) / length,
        behavior: "instant",
      });
    },
    { distance: 4.2, length: journeyLength },
  );
  release();
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  await expect
    .poll(
      async () =>
        Number(await page.locator("canvas").getAttribute("data-distance")),
      { timeout: 20000 },
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
    [0, 2.1],
    [2, 5.1],
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
  const skip = page.getByRole("link", { name: "Skip to work" });
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#journey-content")).toBeInViewport();
});

test("portrait screen uses scene depth instead of a CSS cutout", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  await page.setViewportSize({ width: 2400, height: 1100 });
  await page.goto("/tr/lab/desk/journey");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  await go(page, 4.85);
  const panel = page.locator('[data-screen="0"]');
  const surface = panel.locator(":scope > div").first();
  await expect(surface).toBeVisible();
  await expect
    .poll(() => surface.evaluate((p) => getComputedStyle(p).maskImage))
    .toBe("none");
  await expect
    .poll(() => panel.evaluate((p) => getComputedStyle(p).transform))
    .toContain("matrix3d");
  await expect
    .poll(() => panel.evaluate((p) => getComputedStyle(p).backgroundColor))
    .toBe("rgba(0, 0, 0, 0)");
  await go(page, 2.1);
  await expect(panel).not.toHaveAttribute("inert", "");
});

test("home keeps desk interactions available and exits promptly after the full view", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "WebGL2 is covered in Chromium; WebKit covers the static alternative.",
  );
  await page.goto("/en");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  await expect(page.locator('[data-screen="1"] article')).toHaveCount(0);
  await expect(page.getByText("Scroll down", { exact: true })).toBeVisible();
  await go(page, 2.1);
  await expect(page.getByText("Desk objects", { exact: true })).toBeVisible();
  await page.getByText("Desk objects", { exact: true }).click();
  await page
    .getByRole("button", { name: "Wave the drawers", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-drawers-motion",
    "running",
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-drawers-motion",
    "idle",
    { timeout: 5000 },
  );
  await go(page, 7.6);
  const camera = await page.locator("canvas").getAttribute("data-camera");
  await expect(page.locator("[data-continue-cue]")).toContainText(
    "Scroll to continue",
  );
  await go(page, journeyLength);
  expect(await page.locator("canvas").getAttribute("data-camera")).toBe(camera);
  await go(page, 2.1);
  await expect(page.getByText("Desk objects", { exact: true })).toBeVisible();
});

test("cosmic grid remains active through close-ups and returns to demand-rendered idle", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName === "webkit" || isMobile,
    "The deformation is reserved for fine pointers; mobile keeps scroll depth.",
  );
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  const canvas = page.locator("canvas");

  for (const distance of [0, 2.1, 5.5, 7.6]) {
    await go(page, distance);
    await expect(canvas).toHaveAttribute("data-cosmic-reveal", "1.000");
  }
  await go(page, 5.5);
  const backgroundPoint = await page.evaluate(() => {
    const candidates = [
      [20, innerHeight * 0.35],
      [innerWidth - 20, innerHeight * 0.35],
      [20, innerHeight * 0.7],
      [innerWidth - 20, innerHeight * 0.7],
    ];
    const point = candidates.find(([x, y]) => {
      const target = document.elementFromPoint(x, y);
      return !target?.closest(
        'a, button, summary, [data-screen], [data-cosmic-exclusion="true"]',
      );
    });
    return point ? { x: point[0], y: point[1] } : null;
  });
  expect(backgroundPoint).not.toBeNull();
  await page.mouse.move(backgroundPoint!.x, backgroundPoint!.y);
  await expect
    .poll(() =>
      canvas.getAttribute("data-grid-influence").then((value) => Number(value)),
    )
    .toBeGreaterThan(0.5);

  await expect
    .poll(
      async () => {
        const before = await canvas.getAttribute("data-frames");
        await page.waitForTimeout(400);
        return (await canvas.getAttribute("data-frames")) === before;
      },
      { timeout: 10000 },
    )
    .toBe(true);

  await page.getByText("Desk objects", { exact: true }).hover();
  await expect
    .poll(() =>
      canvas.getAttribute("data-grid-influence").then((value) => Number(value)),
    )
    .toBeLessThan(0.02);
});

test("home uses one localized journey bar", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await expect(page.locator(".site-header")).toHaveCount(0);
  const navigation = page.getByRole("navigation", {
    name: "Journey sections",
  });
  await expect(navigation).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Onur Ergüden", exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Türkçeye geç", exact: true }),
  ).toBeVisible();
});

test("journey bar hides after travel and returns at the top edge", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName === "webkit" || isMobile,
    "Requires a fine pointer and WebGL2.",
  );
  await page.goto("/en");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  const navigation = page.getByRole("navigation", {
    name: "Journey sections",
  });
  const compactHeight = await navigation.evaluate(
    (node) => node.getBoundingClientRect().height,
  );
  await page.mouse.move(720, 50);
  await expect
    .poll(() =>
      navigation.evaluate((node) => node.getBoundingClientRect().height),
    )
    .toBeGreaterThan(compactHeight + 12);
  await page.mouse.move(720, 400);
  await go(page, 2.1);
  await expect(navigation).toHaveAttribute("data-hidden", "true");
  await page.mouse.move(720, 20);
  await expect(navigation).toHaveAttribute("data-hidden", "false");
  await expect(navigation).toBeVisible();
  await page.mouse.move(720, 400);
  await expect(navigation).toHaveAttribute("data-hidden", "true");

  await page.locator("#journey-content").scrollIntoViewIfNeeded();
  await page.mouse.move(720, 400);
  await expect(navigation).toHaveAttribute("data-hidden", "true");
  await page.mouse.move(720, 12);
  await expect(navigation).toHaveAttribute("data-hidden", "false");
  await expect(navigation).toBeInViewport();
  await page.mouse.move(720, 50);
  await page.mouse.move(721, 51);
  await expect
    .poll(() =>
      navigation.evaluate((node) => node.getBoundingClientRect().height),
    )
    .toBeGreaterThan(compactHeight + 12);
});

test("changing the motion preference restores the journey without reloading", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("#desk-story-0")).toBeVisible();
});
