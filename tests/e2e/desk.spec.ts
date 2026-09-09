import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const locale of ["en", "tr"]) {
  test(`${locale}: desk review starts with accessible static views and no model request`, async ({
    page,
  }) => {
    const models: string[] = [];
    page.on("request", (request) => {
      if (/onur-desk\.glb|draco_decoder/.test(request.url()))
        models.push(request.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/lab/desk`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("canvas")).toHaveCount(0);
    const views = page.getByRole("group").getByRole("button");
    for (let index = 0; index < 4; index++) {
      await views.nth(index).click();
      await expect(views.nth(index)).toHaveAttribute("aria-pressed", "true");
      await expect
        .poll(() =>
          page
            .locator("[data-desk-stage] img")
            .evaluate(
              (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
            ),
        )
        .toBe(true);
    }
    expect(models).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}

test("desk camera visits four stops, respects budgets and stops idle rendering", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Headless WebKit has no reliable WebGL2 device; fallback is tested separately.",
  );
  await page.goto("/en/lab/desk");
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  const canvas = page.locator("canvas");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-triangles")), {
      timeout: 20000,
    })
    .toBeGreaterThan(1000);
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  await expect(canvas).toHaveAttribute("tabindex", "-1");
  for (let i = 0; i < 4; i++) {
    await page.getByRole("group").getByRole("button").nth(i).click();
    await expect(canvas).toHaveAttribute("data-progress", String(i));
    expect(
      Number(await canvas.getAttribute("data-draw-calls")),
    ).toBeLessThanOrEqual(50);
    expect(
      Number(await canvas.getAttribute("data-triangles")),
    ).toBeLessThanOrEqual(100000);
    // The selected HTML panel stays inside the viewport at each close stop.
    if (i > 0) {
      const rect = await page.locator(`[data-screen="${i - 1}"]`).boundingBox();
      const stage = await page.locator("[data-desk-stage]").boundingBox();
      expect(rect).not.toBeNull();
      expect(stage).not.toBeNull();
      expect(rect!.x).toBeGreaterThanOrEqual(stage!.x - 2);
      expect(rect!.y).toBeGreaterThanOrEqual(stage!.y - 2);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(
        stage!.x + stage!.width + 2,
      );
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(
        stage!.y + stage!.height + 2,
      );
    }
  }
  await page.waitForTimeout(200);
  const frames = await canvas.getAttribute("data-frames");
  await page.waitForTimeout(500);
  expect(await canvas.getAttribute("data-frames")).toBe(frames);
  // A real wheel gesture scrolls the page; the review never captures it.
  await page.locator("[data-desk-stage]").hover();
  const start = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, -400);
  await expect.poll(() => page.evaluate(() => scrollY)).not.toBe(start);
});

test("reduced motion snaps the camera and context loss returns to the current poster", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "WebGL context-loss simulation is Chromium-only.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/lab/desk");
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  const canvas = page.locator("canvas");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-triangles")), {
      timeout: 20000,
    })
    .toBeGreaterThan(1000);
  const slider = page.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("End");
  await expect(canvas).toHaveAttribute("data-progress", "3");
  await canvas.evaluate((element: HTMLCanvasElement) =>
    element
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext(),
  );
  await expect(
    page.getByText("3D is unavailable. You can still inspect all four views."),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("[data-desk-stage] img")).toHaveAttribute(
    "src",
    /macbook/,
  );
});

test("model download failure preserves static review controls", async ({
  page,
}) => {
  await page.route("**/models/desk/onur-desk.glb*", (route) => route.abort());
  await page.goto("/en/lab/desk");
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  await expect(
    page.getByText("3D is unavailable. You can still inspect all four views."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Portrait monitor", exact: true })
    .click();
  await expect(page.locator("[data-desk-stage] img")).toHaveAttribute(
    "src",
    /portrait/,
  );
});
