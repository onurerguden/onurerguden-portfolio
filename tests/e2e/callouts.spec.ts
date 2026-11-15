import { test, expect, type Page } from "@playwright/test";
import { ci, go, story, touchStatic } from "./helpers";

const ready = (page: Page) =>
  expect(page.locator("[data-ready]")).toHaveAttribute("data-ready", "true", {
    timeout: ci(20000),
  });
const canvas = (page: Page) =>
  page.locator("[data-journey-stage] canvas").first();

test.beforeEach(({ browserName, isMobile }) => {
  test.skip(isMobile, touchStatic);
  test.skip(
    browserName === "webkit",
    "WebGL2 is covered in Chromium; WebKit covers the static alternative.",
  );
});

test("the final view's note draws in, taps its objects and leaves once one is clicked", async ({
  page,
}) => {
  await page.goto("/en");
  await ready(page);
  const note = page.locator("[data-desk-callouts]");
  await expect(note).toHaveAttribute("data-state", "off");
  const s = await story(page);
  await go(page, s.room + 0.1);
  await expect(note).toHaveAttribute("data-state", "in");
  await expect(note).toHaveAttribute("data-mode", "side");
  await expect(note).toHaveText("Try clicking the objects");
  await expect(note.locator("svg[data-arrow]")).toHaveCount(3);
  // Each pointed object is tapped once the arrows have drawn.
  await expect
    .poll(async () => Number(await canvas(page).getAttribute("data-teases")), {
      timeout: ci(6000),
    })
    .toBeGreaterThanOrEqual(3);
  // Leaving the final view hides it; coming back draws it again.
  await go(page, s.room - 0.6);
  await expect(note).toHaveAttribute("data-state", "off");
  await go(page, s.room + 0.1);
  await expect(note).toHaveAttribute("data-state", "in");
  // A desk object used (here from the keyboard list, whose focus may
  // move the view): the note is done for the visit.
  await page.getByText("Desk objects", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /^Lamp color/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => sessionStorage.getItem("portfolio:callouts-done")),
    )
    .toBe("1");
  await expect(note).not.toHaveAttribute("data-state", "in");
  await page.reload();
  await ready(page);
  await go(page, (await story(page)).room + 0.1);
  await page.waitForTimeout(800);
  await expect(note).not.toHaveAttribute("data-state", "in");
});

test("the note speaks Turkish on the Turkish page and stays still when motion is paused", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("portfolio:motion-paused", "true"),
  );
  await page.goto("/tr");
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-paused",
    "true",
  );
  const s = await story(page);
  await go(page, s.room + 0.1);
  const note = page.locator("[data-desk-callouts]");
  await expect(note).toHaveAttribute("data-state", "in");
  await expect(note).toHaveText("Objelere tıklamayı dene");
  const stroke = note.locator("svg[data-arrow] path").nth(1);
  await expect(stroke).toHaveCSS("animation-name", "none");
  await expect(stroke).toHaveCSS("stroke-dashoffset", "0px");
  // No taps under the pause.
  await page.waitForTimeout(2500);
  expect(Number((await canvas(page).getAttribute("data-teases")) ?? 0)).toBe(0);
});
