import type { Page } from "@playwright/test";

/**
 * Canvas locators scoped to one stage. The home page can hold the desk journey
 * plus section scenes, so a bare `canvas` locator would be ambiguous. Keep bare
 * `canvas` only for "no WebGL anywhere" count assertions.
 */
export const journeyCanvas = (page: Page) =>
  page.locator("[data-journey-stage] canvas");
export const reviewCanvas = (page: Page) =>
  page.locator("[data-desk-stage] canvas");
export const stageCanvas = (page: Page, id: string) =>
  page.locator(`canvas[data-stage-canvas="${id}"]`);

/**
 * Headless Chromium renders WebGL in software, where section scenes stay
 * static by design. Tests of those scenes opt back in explicitly.
 */
export async function forceSectionScenes(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("portfolio:force-3d", "1"),
  );
}
