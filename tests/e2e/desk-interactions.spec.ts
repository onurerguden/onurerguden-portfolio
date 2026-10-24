import { test, expect } from "@playwright/test";
import {
  go,
  journeyCanvas,
  reviewCanvas,
  story,
  ci,
  touchStatic,
  within,
} from "./helpers";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";
import { PerspectiveCamera, Vector3 } from "three";
import scene from "../../src/lib/desk-scene.json";
import interactions from "../../src/lib/desk-interactions.json";

/** CI draws WebGL in software; time-based motion can finish between frames. */
const slowRenderer = Boolean(process.env.CI);

for (const locale of ["en", "tr"] as const) {
  for (const journey of [false, true]) {
    test(`${locale}: ${journey ? "journey" : "review"} desk actions and keyboard access`, async ({
      page,
      browserName,
    }) => {
      test.setTimeout(90000);
      test.skip(
        browserName === "webkit",
        "Headless WebKit has no reliable WebGL2; existing static fallback tests cover it.",
      );
      await page.goto(`/${locale}/lab/desk${journey ? "/journey" : ""}`);
      if (!journey)
        await page
          .getByRole("button", {
            name: locale === "en" ? "Explore in 3D" : "3D olarak incele",
          })
          .click();
      const canvas = journey ? journeyCanvas(page) : reviewCanvas(page);
      await expect(canvas).toHaveAttribute("data-lights", "1.000", {
        timeout: ci(20000),
      });
      // The final view of the desk, where every object is in frame.
      if (journey) await go(page, (await story(page)).room + 0.1);
      const summary = page.getByText(
        locale === "en" ? "Desk objects" : "Masa objeleri",
        { exact: true },
      );
      await summary.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      const dial = page.locator('[data-desk-action="dial"]');
      await expect(dial).toBeFocused();
      await page.keyboard.press("Space");
      await page.waitForTimeout(400);
      await expect(dial).toHaveAttribute("aria-pressed", "false");
      await expect(canvas).toHaveAttribute("data-lights", "0.000");
      for (const color of ["603f4b", "514366", "35546b", "405e4e", "694b2f"]) {
        await page.locator('[data-desk-action="lamp"]').click();
        await page.waitForTimeout(400);
        await expect(canvas).toHaveAttribute("data-lamp-color", color);
        await expect(canvas).toHaveAttribute("data-lights", "0.000");
      }
      // Sample actual rendered pixels only in the unchanged review backdrop.
      if (!journey) {
        const corner = await sharp(await canvas.screenshot())
          .extract({ left: 30, top: 30, width: 1, height: 1 })
          .removeAlpha()
          .raw()
          .toBuffer();
        expect([...corner]).toEqual([23, 25, 28]);
      }
      await dial.click();
      await page.waitForTimeout(400);
      await expect(canvas).toHaveAttribute("data-lights", "1.000");

      const drawers = page.locator('[data-desk-action="drawers"]');
      await drawers.click();
      await expect(canvas).toHaveAttribute("data-last-desk-action", "drawers");
      // The wave lasts about a second. CI renders the desk in software, where
      // a single frame can take longer than that, so the wave is only
      // observable on a GPU; everywhere it must settle back to idle.
      if (!slowRenderer)
        await expect
          .poll(async () =>
            Number(await canvas.getAttribute("data-drawer-peak")),
          )
          .toBeGreaterThan(0);
      await page.waitForTimeout(400);
      await drawers.click();
      await page.waitForTimeout(1200);
      await expect(canvas).toHaveAttribute("data-drawers-motion", "idle");
      await expect(canvas).toHaveAttribute(
        "data-drawer-offsets",
        "0.000,0.000,0.000,0.000",
      );
      if (!journey) {
        await drawers.click();
        await page.waitForTimeout(200);
        await page.evaluate(() => {
          Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
          });
          document.dispatchEvent(new Event("visibilitychange"));
        });
        await expect(canvas).toHaveAttribute("data-drawers-motion", "idle");
        await expect(canvas).toHaveAttribute(
          "data-drawer-offsets",
          "0.000,0.000,0.000,0.000",
        );
        await page.evaluate(() => {
          Reflect.deleteProperty(document, "hidden");
          document.dispatchEvent(new Event("visibilitychange"));
        });
        await page.waitForTimeout(80);
        for (let i = 0; i < 5; i++) {
          await page.locator('[data-desk-action="mouse"]').click();
          await expect(canvas).toHaveAttribute(
            "data-last-desk-action",
            "mouse",
          );
          await expect(canvas).toHaveAttribute("data-mouse-variant", String(i));
          await page.waitForTimeout(800);
          await expect(canvas).toHaveAttribute("data-mouse-motion", "idle");
        }
        await page.locator('[data-desk-action="tablet"]').click();
        await expect(canvas).toHaveAttribute("data-last-desk-action", "tablet");
        await page.waitForTimeout(1000);
        await expect(canvas).toHaveAttribute("data-tablet-motion", "idle");
        const headphones = page.locator('[data-desk-action="headphones"]');
        await headphones.click();
        await expect(headphones).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("details").getByRole("status")).toContainText(
          locale === "en" ? "Music playing" : "Müzik çalıyor",
          { timeout: ci(10000) },
        );
        await headphones.click();
        await expect(page.locator("details").getByRole("status")).toContainText(
          locale === "en" ? "Music paused." : "Müzik duraklatıldı.",
        );
        await page.waitForTimeout(700);
        await expect(canvas).toHaveAttribute("data-headphones-motion", "idle");
      }
      await page.waitForTimeout(80); // Allow the final cached-shadow frame to settle.
      const frames = await canvas.getAttribute("data-frames");
      await page.waitForTimeout(400);
      expect(await canvas.getAttribute("data-frames")).toBe(frames);
      expect(
        Number(await canvas.getAttribute("data-draw-calls")),
      ).toBeLessThanOrEqual(journey ? 130 : 50);
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
  }
}

test("review objects accept direct pointer clicks and reduced motion keeps functional controls", async ({
  page,
  browserName,
}) => {
  test.setTimeout(90000);
  test.skip(browserName === "webkit", "Requires WebGL2.");
  await page.goto("/en/lab/desk");
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  const canvas = reviewCanvas(page);
  await expect(canvas).toHaveAttribute("data-lights", "1.000", {
    timeout: ci(20000),
  });
  await canvas.scrollIntoViewIfNeeded();
  const rect = (await canvas.boundingBox())!;
  const camera = new PerspectiveCamera(43, rect.width / rect.height, 0.01, 12);
  const preset = scene.cameras[0];
  const target = new Vector3(...preset.target);
  const direction = new Vector3(...preset.position).sub(target);
  const fit =
    Math.max(1.7 / camera.aspect, 1.6) / (2 * Math.tan((43 * Math.PI) / 360));
  camera.position.copy(
    direction.multiplyScalar(Math.max(1, fit / direction.length())).add(target),
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();
  for (const id of [
    "dial",
    "lamp",
    "mouse",
    "tablet",
    "headphones",
    "drawers",
  ] as const) {
    // Headphone status opens the controls; close them before the next 3D hit test.
    if ((await page.locator("details").getAttribute("open")) !== null)
      await page.locator("details summary").click();
    const projected = new Vector3(...interactions.targets[id].position).project(
      camera,
    );
    await page.mouse.click(
      rect.x + ((projected.x + 1) * rect.width) / 2,
      rect.y + ((1 - projected.y) * rect.height) / 2,
    );
    await expect(canvas).toHaveAttribute("data-last-desk-action", id);
    await page.waitForTimeout(id === "dial" || id === "lamp" ? 400 : 80);
    if (id === "dial")
      await expect(canvas).toHaveAttribute("data-lights", "0.000");
    else if (id === "lamp")
      await expect(canvas).toHaveAttribute("data-lamp-color", "603f4b");
    else if (id === "headphones")
      await expect(page.locator("details").getByRole("status")).toContainText(
        /Loading music|Music playing/,
      );
    if (["mouse", "tablet", "headphones", "drawers"].includes(id)) {
      await page.waitForTimeout(1600);
      await expect(canvas).toHaveAttribute(`data-${id}-motion`, "idle");
    }
  }
  if ((await page.locator("details").getAttribute("open")) === null)
    await page.locator("details summary").click();
  await page.locator('[data-desk-action="drawers"]').click();
  await page.waitForTimeout(300);
  if (!slowRenderer)
    await expect(canvas).toHaveAttribute("data-drawers-motion", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(80);
  await expect(canvas).toHaveAttribute(
    "data-drawer-offsets",
    "0.000,0.000,0.000,0.000",
  );
  await page.locator('[data-desk-action="drawers"]').click();
  await page.waitForTimeout(80);
  await expect(canvas).toHaveAttribute("data-drawers-motion", "idle");
  await page.locator('[data-desk-action="mouse"]').click();
  await page.waitForTimeout(80);
  await expect(canvas).toHaveAttribute("data-mouse-motion", "idle");
  await page.locator('[data-desk-action="dial"]').click();
  await page.waitForTimeout(80);
  await expect(canvas).toHaveAttribute("data-lights", "1.000");
  await page.locator('[data-desk-action="lamp"]').click();
  await page.waitForTimeout(80);
  await expect(canvas).toHaveAttribute("data-lamp-color", "514366");
});

test("desk objects answer hover and clicks with a lift, a press and a ripple", async ({
  page,
  browserName,
}) => {
  test.setTimeout(90000);
  test.skip(browserName === "webkit", "Requires WebGL2.");
  await page.goto("/en/lab/desk");
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  const canvas = reviewCanvas(page);
  await expect(canvas).toHaveAttribute("data-lights", "1.000", {
    timeout: ci(20000),
  });
  await canvas.scrollIntoViewIfNeeded();
  const rect = (await canvas.boundingBox())!;
  const camera = new PerspectiveCamera(43, rect.width / rect.height, 0.01, 12);
  const preset = scene.cameras[0];
  const target = new Vector3(...preset.target);
  const direction = new Vector3(...preset.position).sub(target);
  const fit =
    Math.max(1.7 / camera.aspect, 1.6) / (2 * Math.tan((43 * Math.PI) / 360));
  camera.position.copy(
    direction.multiplyScalar(Math.max(1, fit / direction.length())).add(target),
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const at = (id: keyof typeof interactions.targets) => {
    const p = new Vector3(...interactions.targets[id].position).project(camera);
    return [
      rect.x + ((p.x + 1) * rect.width) / 2,
      rect.y + ((1 - p.y) * rect.height) / 2,
    ] as const;
  };
  // Hovering marks the canvas's container, which opens the cursor ring.
  await page.mouse.move(...at("lamp"));
  await expect(page.locator("[data-desk-hover]")).toHaveCount(1);
  await page.mouse.move(rect.x + 4, rect.y + 4);
  await expect(page.locator("[data-desk-hover]")).toHaveCount(0);
  // A click ripples, and the lamp's colour changes once the press lands.
  await page.mouse.click(...at("lamp"));
  await expect(canvas).toHaveAttribute("data-ripples-started", "1");
  await expect(canvas).toHaveAttribute("data-lamp-color", "603f4b");
  await expect(canvas).toHaveAttribute("data-ripples", "0", {
    timeout: ci(3000),
  });
  // The headphones hop and the drawers click in before their wave.
  await page.mouse.click(...at("headphones"));
  await expect(canvas).toHaveAttribute("data-headphones-motion", "running");
  await expect(canvas).toHaveAttribute("data-headphones-motion", "idle", {
    timeout: ci(3000),
  });
  if ((await page.locator("details").getAttribute("open")) !== null)
    await page.locator("details summary").click();
  await page.mouse.click(...at("drawers"));
  await expect(canvas).toHaveAttribute("data-drawers-motion", "running");
  await expect(canvas).toHaveAttribute("data-drawers-motion", "idle", {
    timeout: ci(5000),
  });
  await expect(canvas).toHaveAttribute("data-ripples-started", "3");
  await expect(canvas).toHaveAttribute("data-ripples", "0");
});

test("desk teases hint at objects from the MacBook to the curtain, a few per visit", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.setTimeout(90000);
  test.skip(browserName === "webkit", "Requires WebGL2.");
  // QA visits skip teases unless a test sets their quiet time.
  await page.addInitScript(() =>
    localStorage.setItem("portfolio:teases", "300"),
  );
  await page.goto("/en");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  const canvas = journeyCanvas(page);
  const s = await story(page);
  // None before the final view.
  await go(page, within(s.portrait, 0.3));
  await page.waitForTimeout(1500);
  expect(await canvas.getAttribute("data-teases")).toBeNull();
  // From leaving the MacBook's screen on the way to the full view…
  await go(page, (s.macbook[1] + s.room) / 2);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-teases")), {
      timeout: ci(10000),
    })
    .toBeGreaterThan(0);
  // …through the full view, four per visit.
  await go(page, s.room + 0.1);
  await expect(canvas).toHaveAttribute("data-teases", "4", {
    timeout: ci(10000),
  });
  await page.waitForTimeout(2000);
  await expect(canvas).toHaveAttribute("data-teases", "4");
  // Teases change nothing: the lights stay on, no action is recorded.
  await expect(canvas).toHaveAttribute("data-lights", "1.000");
  expect(await canvas.getAttribute("data-last-desk-action")).toBeNull();
});

test("desk teases wait while motion is paused", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(browserName === "webkit", "Requires WebGL2.");
  await page.addInitScript(() => {
    localStorage.setItem("portfolio:teases", "300");
    sessionStorage.setItem("portfolio:motion-paused", "true");
  });
  await page.goto("/en");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  await page.evaluate(() => {
    document.documentElement.dataset.motionPaused = "true";
  });
  const s = await story(page);
  await go(page, s.room + 0.1);
  await page.waitForTimeout(2000);
  expect(await journeyCanvas(page).getAttribute("data-teases")).toBeNull();
});

test("the headphones' music plays on past the desk and pauses from its own button", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.setTimeout(90000);
  test.skip(browserName === "webkit", "Requires WebGL2 and Opus playback.");
  const audio: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/audio/"))
      audio.push(request.url());
  });
  await page.goto("/en");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  await go(page, (await story(page)).room + 0.1);
  // Nothing is fetched until the headphones are selected.
  expect(audio).toEqual([]);
  await page.getByText("Desk objects", { exact: true }).focus();
  await page.keyboard.press("Enter");
  const headphones = page.locator('[data-desk-action="headphones"]');
  await headphones.click();
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-music", "playing", {
    timeout: ci(10000),
  });
  expect(audio).toHaveLength(1);
  expect(audio[0]).toMatch(/\/audio\/desk-jazz\.webm\?v=[0-9a-f]{12}$/);
  const pill = page.getByRole("button", { name: "Pause music" });
  await expect(pill).toBeVisible();
  // Past the desk, the scene may be released; the music plays on.
  await page.evaluate(() =>
    document
      .querySelector("#projects")
      ?.scrollIntoView({ behavior: "instant" }),
  );
  await page.waitForTimeout(1500);
  await expect(html).toHaveAttribute("data-music", "playing");
  await pill.focus();
  await page.keyboard.press("Enter");
  await expect(html).toHaveAttribute("data-music", "paused");
  await expect(page.getByRole("button", { name: "Play music" })).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .include("button[data-music-pill]")
    .analyze();
  expect(audit.violations).toEqual([]);
  // One button, and its styles are not mistaken for it.
  await expect(page.locator("[data-music-pill]")).toHaveCount(1);
  // A hidden tab pauses what plays and resumes it on return.
  await page.getByRole("button", { name: "Play music" }).click();
  await expect(html).toHaveAttribute("data-music", "playing");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(html).toHaveAttribute("data-music", "paused");
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(html).toHaveAttribute("data-music", "playing", {
    timeout: ci(10000),
  });
});

test("the music's button speaks Turkish on the Turkish page", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.setTimeout(90000);
  test.skip(browserName === "webkit", "Requires WebGL2 and Opus playback.");
  await page.goto("/tr");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
  );
  await go(page, (await story(page)).room + 0.1);
  await page.getByText("Masa objeleri", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-desk-action="headphones"]').click();
  await expect(
    page.getByRole("button", { name: "Müziği duraklat" }),
  ).toBeVisible({ timeout: ci(10000) });
});
