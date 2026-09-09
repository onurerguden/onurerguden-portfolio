import { test, expect } from "@playwright/test";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";
import { PerspectiveCamera, Vector3 } from "three";
import scene from "../../src/lib/desk-scene.json";
import interactions from "../../src/lib/desk-interactions.json";

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
      await page.clock.install();
      await page.goto(`/${locale}/lab/desk${journey ? "/journey" : ""}`);
      if (!journey)
        await page
          .getByRole("button", {
            name: locale === "en" ? "Explore in 3D" : "3D olarak incele",
          })
          .click();
      const canvas = page.locator("canvas");
      await expect(canvas).toHaveAttribute("data-lights", "1.000", {
        timeout: 20000,
      });
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
      await expect(dial).toHaveAttribute("aria-pressed", "false");
      await expect(canvas).toHaveAttribute("data-lights", "0.000");
      for (const color of ["514366", "35546b", "405e4e", "694b2f", "603f4b"]) {
        await page.locator('[data-desk-action="lamp"]').click();
        await expect(canvas).toHaveAttribute("data-lamp-color", color);
        await expect(canvas).toHaveAttribute("data-lights", "0.000");
      }
      // Sample actual rendered pixels: lamp color must never tint the backdrop.
      const corner = await sharp(await canvas.screenshot())
        .extract({ left: 30, top: 30, width: 1, height: 1 })
        .removeAlpha()
        .raw()
        .toBuffer();
      expect([...corner]).toEqual([0, 0, 0]);
      await dial.click();
      await expect(canvas).toHaveAttribute("data-lights", "1.000");
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      for (let i = 0; i < 5; i++) {
        await page
          .locator('[data-desk-action="mouse"]')
          .evaluate((button: HTMLButtonElement) => {
            button.click();
            button.click();
          });
        await page.clock.runFor(80);
        await expect(canvas).toHaveAttribute("data-mouse-motion", "running");
        await expect(canvas).toHaveAttribute("data-mouse-variant", String(i));
        await page.clock.fastForward(800);
        await expect(canvas).toHaveAttribute("data-mouse-motion", "idle");
      }
      await page.locator('[data-desk-action="tablet"]').click();
      await page.clock.runFor(80);
      await expect(canvas).toHaveAttribute("data-tablet-motion", "running");
      await page.clock.fastForward(1000);
      await expect(canvas).toHaveAttribute("data-tablet-motion", "idle");
      await page.locator('[data-desk-action="headphones"]').click();
      await expect(page.locator("details").getByRole("status")).toContainText(
        locale === "en"
          ? "Music has not been added yet."
          : "Müzik henüz eklenmedi.",
      );
      await page.clock.fastForward(700);
      await expect(canvas).toHaveAttribute("data-headphones-motion", "idle");
      const frames = await canvas.getAttribute("data-frames");
      await page.clock.fastForward(400);
      expect(await canvas.getAttribute("data-frames")).toBe(frames);
      expect(
        Number(await canvas.getAttribute("data-draw-calls")),
      ).toBeLessThanOrEqual(50);
      await page.clock.resume();
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
  test.skip(browserName === "webkit", "Requires WebGL2.");
  await page.clock.install();
  await page.goto("/en/lab/desk");
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-lights", "1.000", {
    timeout: 20000,
  });
  await canvas.scrollIntoViewIfNeeded();
  const rect = (await canvas.boundingBox())!;
  const camera = new PerspectiveCamera(43, rect.width / rect.height, 0.01, 12);
  const preset = scene.cameras[0];
  const target = new Vector3(...preset.target);
  const direction = new Vector3(...preset.position).sub(target);
  const fit =
    Math.max(1.7 / camera.aspect, 0.85) / (2 * Math.tan((43 * Math.PI) / 360));
  camera.position.copy(
    direction.multiplyScalar(Math.max(1, fit / direction.length())).add(target),
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  for (const id of ["dial", "lamp", "mouse", "tablet", "headphones"] as const) {
    const projected = new Vector3(...interactions.targets[id].position).project(
      camera,
    );
    await page.mouse.click(
      rect.x + ((projected.x + 1) * rect.width) / 2,
      rect.y + ((1 - projected.y) * rect.height) / 2,
    );
    await page.clock.runFor(id === "dial" || id === "lamp" ? 400 : 80);
    if (id === "dial")
      await expect(canvas).toHaveAttribute("data-lights", "0.000");
    else if (id === "lamp")
      await expect(canvas).toHaveAttribute("data-lamp-color", "514366");
    else if (id === "headphones")
      await expect(page.locator("details").getByRole("status")).toHaveText(
        "Music has not been added yet.",
      );
    else await expect(canvas).toHaveAttribute(`data-${id}-motion`, "running");
    if (["mouse", "tablet", "headphones"].includes(id)) {
      await page.clock.fastForward(1100);
      await expect(canvas).toHaveAttribute(`data-${id}-motion`, "idle");
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('[data-desk-action="mouse"]').click();
  await page.clock.runFor(80);
  await expect(canvas).toHaveAttribute("data-mouse-motion", "idle");
  await page.locator('[data-desk-action="dial"]').click();
  await page.clock.runFor(80);
  await expect(canvas).toHaveAttribute("data-lights", "1.000");
  await page.locator('[data-desk-action="lamp"]').click();
  await page.clock.runFor(80);
  await expect(canvas).toHaveAttribute("data-lamp-color", "35546b");
});
