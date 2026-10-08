import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  go,
  journeyCanvas,
  scrollToDistance,
  story,
  within,
  ci,
  touchStatic,
} from "./helpers";

test("opening portrait stays sharp until scroll and returns on reverse", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  await page.goto("/tr");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  const opening = page.locator("[data-opening-poster]");
  await expect(opening).toHaveCSS("opacity", "1");
  const image = opening.locator("img");
  await expect(image).toHaveAttribute(
    "src",
    "/images/avatar/onur-head-v4.webp",
  );
  const resolution = await image.evaluate((element) => {
    const portrait = element as HTMLImageElement;
    return {
      natural: portrait.naturalWidth,
      displayed: portrait.getBoundingClientRect().width,
    };
  });
  expect(resolution.natural).toBeGreaterThanOrEqual(resolution.displayed);
  const alignment = await page.evaluate(() => {
    const opening = document.querySelector("[data-opening-poster]");
    const projected = document.querySelector('[data-screen="1"]');
    return [
      "[data-portrait-poster]",
      "[data-portrait-name]",
      "[data-portrait-role]",
    ].map((selector) => {
      const a = opening!.querySelector(selector)!.getBoundingClientRect();
      const b = projected!.querySelector(selector)!.getBoundingClientRect();
      return Math.max(
        Math.abs(a.x - b.x),
        Math.abs(a.y - b.y),
        Math.abs(a.width - b.width),
        Math.abs(a.height - b.height),
      );
    });
  });
  expect(Math.max(...alignment)).toBeLessThan(1);
  await go(page, 0.075);
  const halfwayOpacity = Number(
    await opening.evaluate((node) => getComputedStyle(node).opacity),
  );
  expect(halfwayOpacity).toBeGreaterThan(0.35);
  expect(halfwayOpacity).toBeLessThan(0.65);
  await go(page, 0.18);
  await expect(opening).toHaveCSS("opacity", "0");
  await go(page, 0);
  await expect(opening).toHaveCSS("opacity", "1");
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
    await expect(page.locator("#services")).toBeVisible();
    await expect(page.locator("#experience")).toBeVisible();
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
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(
    browserName === "webkit",
    "Headless WebKit has no reliable WebGL2; static paths are covered.",
  );
  // Five camera stops, an axe scan of the whole (now long) page and a
  // release and remount of the desk take about 50 s on a busy machine.
  test.slow();
  // Every image in the flow, the remount poster included, must load: the
  // optimizer answers 400 to a src outside images.localPatterns.
  const failedImages: string[] = [];
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "image" &&
      response.status() >= 400
    ) {
      failedImages.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto("/tr/lab/desk/journey");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  const canvas = journeyCanvas(page);
  const s = await story(page);
  await go(page, within(s.portrait, 0.05));
  const camera = await canvas.getAttribute("data-camera");
  await go(page, within(s.portrait, 0.8));
  expect(await canvas.getAttribute("data-camera")).toBe(camera);
  expect(
    Number(await page.locator('[data-screen="0"]').getAttribute("data-offset")),
  ).toBeGreaterThan(100);
  await go(page, within(s.portrait, 0.05));
  expect(await canvas.getAttribute("data-camera")).toBe(camera);
  // On the way to the MacBook (which may fill a phone's view and stop the
  // desk drawing) the camera moves.
  await go(page, s.portrait[1] + 0.6);
  expect(await canvas.getAttribute("data-camera")).not.toBe(camera);
  await go(page, within(s.macbook, 0.1));
  await page.locator('[data-screen="2"] [data-explorer-list] a').last().focus();
  // The story's own distance: the desk may stop drawing behind a takeover.
  await expect
    .poll(async () =>
      Number(await page.locator("[data-story]").getAttribute("data-distance")),
    )
    .toBeGreaterThan(within(s.macbook, 0.5));
  await expect(
    page.locator('[data-screen="2"] [data-explorer-list] a').last(),
  ).toBeInViewport();
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
    .getByRole("link", { name: "Masa turunu geç", exact: true })
    .last();
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#about")).toBeInViewport();
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
  );
  // Far below, the desk releases its WebGL context for the section scenes.
  await expect(page.locator("[data-journey-released]")).toHaveAttribute(
    "data-journey-released",
    "true",
    { timeout: ci(5000) },
  );
  await expect(canvas).toHaveCount(0);
  // Returning remounts it from the model cache behind the final-view poster.
  // The final hold, where the desk is in view: at the story's end the paper
  // curtain has drawn it aside and it rightly stops drawing.
  await scrollToDistance(page, s.exit ? s.exit[0] : s.length);
  await expect(page.locator("[data-journey-released]")).toHaveAttribute(
    "data-journey-released",
    "false",
  );
  await expect(page.locator("[data-journey-poster]")).toHaveCount(0, {
    timeout: ci(20000),
  });
  await expect(canvas).toHaveAttribute("data-active", "true");
  expect(failedImages).toEqual([]);
});
test("the desk draws nothing until its shaders are ready", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  // Hold the model back: the canvas exists, everything around it is mounted
  // and asking for frames, but a frame drawn now would compile shaders on
  // the page's main thread.
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/models/desk/onur-desk.glb*", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/en");
  const canvas = journeyCanvas(page);
  await expect(canvas).toBeAttached({ timeout: ci(20000) });
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(800);
  await expect(canvas).not.toHaveAttribute("data-frames", /.*/);
  release();
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(30000) },
  );
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(0);
});

test("the MacBook's Bliss layers wait for the visitor to move", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  const bliss: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/images/bliss/")) bliss.push(request.url());
  });
  await page.goto("/en");
  await expect(page.locator("[data-enhanced]")).toHaveAttribute(
    "data-enhanced",
    "true",
    { timeout: ci(20000) },
  );
  await page.waitForTimeout(1000);
  expect(bliss.filter((url) => !url.includes("original"))).toEqual([]);
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 400);
  await expect
    .poll(() => bliss.length, { timeout: ci(10000) })
    .toBeGreaterThan(0);
});

test("failed model collapses the pinned journey and preserves content", async ({
  page,
}) => {
  await page.route("**/models/desk/onur-desk.glb*", (route) => route.abort());
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("[data-enhanced]")).toHaveAttribute(
    "data-enhanced",
    "false",
    { timeout: ci(20000) },
  );
  await expect(page.locator("#services")).toBeVisible();
  await expect(page.locator("#journey-content")).toBeAttached();
});
test("without JavaScript the complete story and continuation are present", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("#services")).toBeVisible();
  await expect(page.locator("#experience")).toBeVisible();
  await expect(page.locator("#journey-content")).toBeAttached();
  await expect(page.locator("canvas")).toHaveCount(0);
  await context.close();
});

test("late loading keeps the current scroll position; context loss restores normal flow", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
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
  // Between the monitor and the MacBook, measured before the model loads.
  const s = await story(page);
  const travel = s.portrait[1] + 0.4;
  await scrollToDistance(page, travel);
  release();
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  await expect
    .poll(
      async () =>
        Number(await journeyCanvas(page).getAttribute("data-distance")),
      { timeout: ci(20000) },
    )
    .toBeCloseTo(travel, 1);
  await journeyCanvas(page).evaluate((canvas) =>
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
  );
  await expect(page.locator("[data-enhanced]")).toHaveAttribute(
    "data-enhanced",
    "false",
  );
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("#services")).toBeVisible();
});

test("narrow and zoom-equivalent viewports preserve screen links and readable type", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  const s = await story(page);
  for (const [screen, d] of [
    [0, within(s.portrait, 0.02)],
    [2, within(s.macbook, 0.05)],
  ]) {
    await go(page, d);
    const text = page
      .locator(
        `[data-screen="${screen}"] ${screen ? "[data-explorer-list] li" : "[data-reveal-row] p"}`,
      )
      .first();
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
  await go(page, (await story(page)).portrait[1]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const skip = page.getByRole("link", { name: "Skip the desk tour" });
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#about")).toBeInViewport();
});

test("portrait screen uses scene depth instead of a CSS cutout", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  await page.setViewportSize({ width: 2400, height: 1100 });
  await page.goto("/tr/lab/desk/journey");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  const s = await story(page);
  await go(page, s.portrait[1] + 0.7);
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
  await go(page, within(s.portrait, 0.1));
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
    { timeout: ci(20000) },
  );
  await expect(page.locator('[data-screen="1"] article')).toHaveCount(0);
  await expect(page.locator("[data-scroll-hint]")).toBeVisible();
  const s = await story(page);
  await go(page, within(s.portrait, 0.05));
  // The object list stays out of sight until keyboard focus reaches it.
  const objects = page.locator("details[data-journey]");
  await expect(objects).toHaveCSS("opacity", "0");
  await page.getByText("Desk objects", { exact: true }).focus();
  await expect(objects).toHaveCSS("opacity", "1");
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Wave the drawers", exact: true })
    .click();
  await expect(journeyCanvas(page)).toHaveAttribute(
    "data-drawers-motion",
    "running",
  );
  await expect(journeyCanvas(page)).toHaveAttribute(
    "data-drawers-motion",
    "idle",
    { timeout: ci(5000) },
  );
  await go(page, s.room + 0.1);
  const camera = await journeyCanvas(page).getAttribute("data-camera");
  await expect(page.locator("[data-continue-cue]")).toBeVisible();
  await expect(page.locator("[data-continue-cue]")).toHaveText("");
  await go(page, s.length);
  expect(await journeyCanvas(page).getAttribute("data-camera")).toBe(camera);
  await go(page, within(s.portrait, 0.05));
  await expect(page.getByText("Desk objects", { exact: true })).toBeAttached();
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
    { timeout: ci(20000) },
  );
  const canvas = journeyCanvas(page);
  const s = await story(page);
  for (const distance of [
    0,
    within(s.portrait, 0.05),
    within(s.macbook, 0.5),
    s.room + 0.1,
  ]) {
    await go(page, distance);
    await expect(canvas).toHaveAttribute("data-cosmic-reveal", "1.000");
  }
  await go(page, within(s.macbook, 0.5));
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
      { timeout: ci(10000) },
    )
    .toBe(true);

  // A screen is excluded from the grid's pointer, like every control. A
  // plain move: hover() would scroll the projected panel's layout box.
  const screen = await page.locator('[data-screen="2"]').boundingBox();
  await page.mouse.move(
    screen!.x + screen!.width / 2,
    screen!.y + screen!.height / 2,
  );
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
    { timeout: ci(20000) },
  );
  // Headless Linux Chromium (CI) reports no fine pointer, so the bar's
  // pointer reveal does not exist there.
  test.skip(
    !(await page.evaluate(
      () => matchMedia("(hover: hover) and (pointer: fine)").matches,
    )),
    "The browser reports no fine pointer.",
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
  await go(page, within((await story(page)).portrait, 0.05));
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
  // Switch only once the page is interactive, so the change is heard.
  await page.waitForLoadState("networkidle");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("#services")).toBeVisible();
});

test("the monitor reads What I do and Experience the same both ways", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(browserName === "webkit", "Headless WebKit lacks reliable WebGL2.");
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  const s = await story(page);
  const panel = page.locator('[data-screen="0"]');
  await expect(panel.getByRole("heading", { level: 3 })).toHaveCount(9);
  const frame = () =>
    page.evaluate(() => {
      const panel = document.querySelector('[data-screen="0"]') as HTMLElement;
      return {
        offset: panel.dataset.offset,
        reveal: [...panel.querySelectorAll<HTMLElement>("[data-reveal-row]")]
          .map((row) => row.style.getPropertyValue("--reveal"))
          .join(),
        camera: document
          .querySelector("[data-journey-stage] canvas")
          ?.getAttribute("data-camera"),
      };
    });
  const middle = within(s.portrait, 0.45);
  await go(page, middle);
  const forward = await frame();
  // Rows below the window have not lit up yet.
  expect(forward.reveal).toMatch(/0\.000/);
  await go(page, s.macbook[0]);
  await go(page, middle);
  expect(await frame()).toEqual(forward);
  await go(page, within(s.portrait, 0.1));
  await go(page, middle);
  expect(await frame()).toEqual(forward);
});

test("monitor rows fill from the side the pointer enters", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName === "webkit" || isMobile,
    "Hover needs a fine pointer and WebGL2.",
  );
  await page.goto("/en/lab/desk/journey");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  await go(page, (await story(page)).chapters.services);
  const row = page.locator('[data-screen="0"] [data-row]').first();
  const box = (await row.boundingBox())!;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, box.y - 30);
  await page.mouse.move(x, box.y + 12, { steps: 4 });
  await expect(row).toHaveAttribute("data-enter", "top");
  await page.mouse.move(x, box.y + box.height + 30, { steps: 4 });
  await expect(row).toHaveAttribute("data-exit", "bottom");
  await page.mouse.move(x, box.y + box.height - 12, { steps: 4 });
  await expect(row).toHaveAttribute("data-enter", "bottom");
  await expect
    .poll(() =>
      row.evaluate(
        (node) => getComputedStyle(node, "::before").transformOrigin,
      ),
    )
    .toMatch(/ \d+(\.\d+)?px$/);
});

for (const id of ["services", "experience"])
  test(`#${id} opens the desk on that chapter`, async ({
    page,
    browserName,
    isMobile,
  }) => {
    test.skip(isMobile, touchStatic);
    test.skip(
      browserName === "webkit",
      "Headless WebKit lacks reliable WebGL2.",
    );
    await page.goto(`/en/lab/desk/journey#${id}`);
    await expect(page.locator("[data-ready]")).toHaveAttribute(
      "data-ready",
      "true",
      { timeout: ci(20000) },
    );
    const s = await story(page);
    await expect
      .poll(
        async () =>
          Number(await journeyCanvas(page).getAttribute("data-distance")),
        { timeout: ci(20000) },
      )
      .toBeCloseTo(s.chapters[id as "services"], 1);
    await expect(page.locator(`#${id}-title`)).toBeInViewport();
    await expect(
      page
        .getByRole("navigation", { name: "Journey sections" })
        .getByRole("link", {
          name: id === "services" ? "What I do" : "Experience",
        }),
    ).toHaveAttribute("aria-current", "location");
  });

test("keyboard focus and the step buttons bring monitor content into view", async ({
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
  // The story's own distance: on a phone the MacBook takes over the view and
  // the desk canvas stops drawing, so its counters lag.
  // The VBT row's link sits deep in Experience.
  const link = page
    .locator('[data-screen="0"]')
    .getByRole("link", { name: /TaskFoo/ });
  await link.focus();
  await expect
    .poll(async () =>
      Number(await page.locator("[data-story]").getAttribute("data-distance")),
    )
    .toBeGreaterThan(s.chapters.experience);
  await expect(link).toBeInViewport();
  // The step buttons appear for keyboard focus only.
  await page.getByRole("button", { name: "Next: Tech stack" }).focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(async () =>
      Number(await page.locator("[data-story]").getAttribute("data-distance")),
    )
    .toBeCloseTo(s.chapters.stack, 1);
  // The step buttons appear for keyboard focus only.
  await page.getByRole("button", { name: "Previous: Experience" }).focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(async () =>
      Number(await page.locator("[data-story]").getAttribute("data-distance")),
    )
    .toBeCloseTo(s.chapters.experience, 1);
});
