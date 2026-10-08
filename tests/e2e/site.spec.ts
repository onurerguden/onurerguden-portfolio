import { test, expect, type Page } from "@playwright/test";
import {
  forceSectionScenes,
  journeyCanvas,
  ci,
  reach,
  touchStatic,
} from "./helpers";
import AxeBuilder from "@axe-core/playwright";
const paths = [
  "",
  "/projects",
  "/research",
  "/projects/kuyumcum",
  "/projects/water-safety",
  "/projects/course-intelligence",
  "/projects/gymrap-ai-coach",
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
    await reach(page, "work");
    for (const image of await page.locator(".phone-pair img").all()) {
      // WebKit loads lazy images only near the view.
      await image.scrollIntoViewIfNeeded();
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
  // A full navigation, so the document announces its new language.
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await page.getByRole("link", { name: "Araştırma", exact: true }).click();
  await expect(page).toHaveURL(/\/tr\/research$/);
  await expect(
    page.getByText("Kabul edildi", { exact: false }).first(),
  ).toBeVisible();
});
test("reduced motion keeps the HTML explanation without WebGL", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await expect(
    page.getByRole("heading", { level: 1, name: "Onur Ergüden, AI engineer" }),
  ).toBeVisible();
  await page.waitForTimeout(2200);
  await expect(page.locator("canvas")).toHaveCount(0);
});
async function scrollThroughHome(page: Page, check: () => Promise<void>) {
  const { height, step } = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    step: Math.round(innerHeight / 2),
  }));
  for (const top of [
    ...Array.from({ length: Math.ceil(height / step) + 1 }, (_, i) => i * step),
    height / 2,
    0,
  ]) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), top);
    await page.waitForTimeout(80);
    await check();
  }
}
test("reduced motion creates no WebGL on the home page but the tech stack balls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  // The balls drop under reduced motion at Onur's request (docs/design.md).
  await scrollThroughHome(page, async () => {
    await expect(
      page.locator('canvas:not([data-stage-canvas="desk-stack"])'),
    ).toHaveCount(0);
  });
});
test("the home page never holds more than two WebGL contexts", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(browserName === "webkit", "Headless WebKit lacks WebGL2.");
  // Walking the whole page with software WebGL (SwiftShader) takes a while.
  test.setTimeout(150000);
  await forceSectionScenes(page);
  await page.goto("/en");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  await scrollThroughHome(page, async () => {
    expect(await page.locator("canvas").count()).toBeLessThanOrEqual(2);
  });
});
test("3D canvas is decorative, within budget and safely loses context", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(
    browserName === "webkit",
    "Headless WebKit may not provide WebGL; fallback is audited separately.",
  );
  await page.goto("/en");
  const canvas = journeyCanvas(page);
  await expect(canvas).toBeVisible({ timeout: ci(15000) });
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  await page.evaluate(() =>
    window.scrollTo({ top: innerHeight * 1.2, behavior: "instant" }),
  );
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  await expect(canvas).toHaveAttribute("tabindex", "-1");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-draw-calls")))
    .toBeGreaterThan(0);
  expect(
    Number(await canvas.getAttribute("data-draw-calls")),
  ).toBeLessThanOrEqual(130);
  expect(
    Number(await canvas.getAttribute("data-triangles")),
  ).toBeLessThanOrEqual(210000);
  await canvas.evaluate((c) =>
    c.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
  );
  await expect(journeyCanvas(page)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "Onur Ergüden, AI engineer" }),
  ).toBeVisible();
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
  const activity = await request.get("/api/github/activity");
  expect(activity.status()).toBe(503);
  expect(activity.headers()["cache-control"]).toBe("no-store");
  expect(await activity.json()).toEqual({ available: false });
});

for (const locale of ["en", "tr"])
  test(`${locale}: content pages and the 404 pass axe on the dark system`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of [...paths.slice(1), "/no-such-page"]) {
      await page.goto(`/${locale}${path}`);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations, path).toEqual([]);
    }
  });

test("a case study section survives switching language", async ({ page }) => {
  await page.goto("/en/projects/kuyumcum#my-contribution");
  await expect(page.locator("#my-contribution")).toBeInViewport();
  await page.getByRole("link", { name: "Türkçeye geç" }).click();
  await expect(page).toHaveURL(/\/tr\/projects\/kuyumcum#my-contribution$/);
  await expect(page.locator("#my-contribution")).toHaveText("Benim katkım");
  await expect(page.locator("#my-contribution")).toBeInViewport();
  const toc = page.getByRole("navigation", { name: "Bu sayfada" });
  await expect(toc.getByRole("link")).toHaveCount(7);
});

test("projects and research each have a share card", async ({ request }) => {
  for (const path of [
    "/en/projects",
    "/en/projects/kuyumcum",
    "/tr/projects/water-safety",
    "/en/projects/course-intelligence",
    "/tr/projects/gymrap-ai-coach",
    "/tr/research",
  ]) {
    const response = await request.get(`${path}/opengraph-image/card`);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(10_000);
  }
});

test("browsers, crawlers and home screens find the icons and the manifest", async ({
  page,
  request,
}) => {
  await page.goto("/en");
  const head = await page.evaluate(() =>
    Object.fromEntries(
      ["icon", "apple-touch-icon", "manifest"].map((rel) => [
        rel,
        [...document.querySelectorAll(`link[rel="${rel}"]`)].map((link) =>
          link.getAttribute("href"),
        ),
      ]),
    ),
  );
  // Each address carries its icon's revision, so a new icon replaces the
  // one browsers keep.
  expect(head.icon).toEqual([
    expect.stringMatching(/^\/favicon\.ico\?v=[0-9a-f]{12}$/),
    expect.stringMatching(/^\/icon\.svg\?v=[0-9a-f]{12}$/),
  ]);
  expect(head["apple-touch-icon"]).toEqual([
    expect.stringMatching(/^\/apple-touch-icon\.png\?v=[0-9a-f]{12}$/),
  ]);
  expect(head.manifest).toHaveLength(1);
  const manifest = await (await request.get(head.manifest[0]!)).json();
  expect(manifest.name).toBe("Onur Ergüden — AI Engineer");
  const icons: { src: string; type: string }[] = manifest.icons;
  for (const src of [
    "/favicon.ico",
    ...(head.icon as string[]),
    ...(head["apple-touch-icon"] as string[]),
    ...icons.map((icon) => icon.src),
  ]) {
    const response = await request.get(src);
    expect(response.status(), src).toBe(200);
    expect(response.headers()["content-type"], src).toMatch(/^image\//);
    if (src.includes("?v="))
      expect(response.headers()["cache-control"], src).toContain("immutable");
  }
});

for (const locale of ["en", "tr"])
  test(`${locale}: the Kuyumcum report workflow chart has a text equivalent`, async ({
    page,
    request,
  }) => {
    await page.goto(`/${locale}/projects/kuyumcum`);
    const figure = page.locator("article figure");
    const image = figure.locator("img");
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
      )
      .toBe(true);
    expect(await image.getAttribute("alt")).toMatch(
      locale === "en" ? /^Flowchart/ : /^Kuyumcum'un/,
    );
    // The steps are folded until asked for, then read in order.
    const steps = figure.locator("details li");
    await expect(steps.first()).toBeHidden();
    await figure.locator("summary").click();
    await expect(steps).toHaveCount(8);
    await expect(steps.first()).toBeVisible();
    const full = await figure.locator("figcaption a").getAttribute("href");
    expect((await request.get(full!)).status()).toBe(200);
  });

test("phones and tablets read the static flow without the desk", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Covers touch devices; desktop keeps the 3D desk.");
  const deskRequests: string[] = [];
  page.on("request", (request) => {
    if (/\.glb|draco/.test(request.url())) deskRequests.push(request.url());
  });
  await page.goto("/en");
  await expect(page.locator("section[data-static]")).toHaveAttribute(
    "data-static",
    "true",
  );
  await page.waitForLoadState("networkidle");
  expect(deskRequests).toEqual([]);
  await expect(journeyCanvas(page)).toHaveCount(0);
  await expect(page.locator("[data-desk-toggle]")).toHaveCount(0);
  // The archive card's image and entries each keep their own space.
  const archive = page.locator('article[aria-labelledby="project-archive"]');
  await archive.scrollIntoViewIfNeeded();
  const overlaps = await archive.evaluate((card) => {
    const grid = card.querySelector("[data-rows]")!;
    const boxes = [...grid.children].map((tile) =>
      tile.getBoundingClientRect(),
    );
    return boxes.flatMap((a, i) =>
      boxes
        .slice(i + 1)
        .filter(
          (b) =>
            a.left < b.right - 1 &&
            b.left < a.right - 1 &&
            a.top < b.bottom - 1 &&
            b.top < a.bottom - 1,
        )
        .map(() => i),
    );
  });
  expect(overlaps).toEqual([]);
});
