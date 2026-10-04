import { expect, type Page } from "@playwright/test";

/**
 * A wait scaled for CI, where WebGL runs in software on shared runners and
 * the desk takes several times longer to load and draw than on a laptop.
 */
export const ci = (ms: number) => (process.env.CI ? ms * 3 : ms);

/**
 * Canvas locators scoped to one stage. The home page can hold the desk journey
 * plus section scenes, so a bare `canvas` locator would be ambiguous. Keep bare
 * `canvas` only for "no WebGL anywhere" count assertions.
 */
export const journeyCanvas = (page: Page) =>
  page.locator("[data-journey-stage] canvas:not([data-stage-canvas])");
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

/** The measured story: lengths in stage heights, as the journey reports it. */
type Story = {
  length: number;
  portrait: [number, number];
  macbook: [number, number];
  room: number;
  chapters: Record<"services" | "experience" | "stack", number>;
};
export async function story(page: Page): Promise<Story> {
  const section = page.locator("[data-story]");
  await expect(section).toHaveCount(1, { timeout: ci(20000) });
  return JSON.parse((await section.getAttribute("data-story"))!);
}
export const within = ([start, end]: [number, number], fraction: number) =>
  start + (end - start) * fraction;
/** Scroll to a story distance without waiting for the desk to draw it. */
export async function scrollToDistance(page: Page, d: number) {
  await page.evaluate((distance) => {
    const section = document.querySelector("[data-enhanced]") as HTMLElement;
    const stage = document.querySelector("[data-journey-stage]") as HTMLElement;
    window.scrollTo({
      top:
        scrollY +
        section.getBoundingClientRect().top +
        stage.offsetHeight * distance,
      behavior: "instant",
    });
  }, d);
}
/**
 * Scrolls to a story distance and waits until the journey is there and, if
 * the desk is drawing, until it has drawn that distance. Behind a screen
 * that fills the view the desk stops drawing, so only the story is awaited.
 */
export async function go(page: Page, d: number) {
  await scrollToDistance(page, d);
  await expect
    .poll(
      () =>
        page.evaluate((target) => {
          const section = document.querySelector("[data-story]") as HTMLElement;
          const canvas = document.querySelector(
            "[data-journey-stage] canvas:not([data-stage-canvas])",
          ) as HTMLElement | null;
          const close = (value: string | undefined) =>
            Math.abs(Number(value) - target) < 0.05;
          return (
            close(section?.dataset.distance) &&
            (!canvas ||
              canvas.dataset.active === "false" ||
              close(canvas.dataset.distance))
          );
        }, d),
      { timeout: ci(20000) },
    )
    .toBe(true);
}
