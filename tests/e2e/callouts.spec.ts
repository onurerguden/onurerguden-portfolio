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

test("the final view's note draws in, taps its objects, stays under the curtain and leaves once one is clicked", async ({
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
  await expect(note.locator("[data-callout-title]")).toHaveText(
    "Try clicking the objects",
  );
  // The headphones have a note of their own, and an arrow like the rest.
  await expect(note.locator("[data-callout-note]")).toHaveText("plays music");
  await expect(note.locator("svg[data-arrow]")).toHaveCount(4);
  await expect(note.locator('svg[data-arrow="headphones"]')).toBeVisible();
  // Each pointed object is tapped once the arrows have drawn.
  await expect
    .poll(async () => Number(await canvas(page).getAttribute("data-teases")), {
      timeout: ci(6000),
    })
    .toBeGreaterThanOrEqual(4);
  // The paper curtain closes over the note; it does not hide ahead of it.
  await go(page, s.exit![0] + 0.4);
  await expect(note).toHaveAttribute("data-state", "in");
  // Once it is covered it is off, not swaying unseen behind the page.
  await go(page, s.exit![1]);
  await expect(note).toHaveAttribute("data-state", "off");
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

test("a clicked object sends the note off with an effect of its own", async ({
  page,
}) => {
  await page.goto("/en");
  await ready(page);
  const s = await story(page);
  await go(page, s.room + 0.1);
  const note = page.locator("[data-desk-callouts]");
  await expect(note).toHaveAttribute("data-state", "in");
  // The lamp, a little past the tip of the arrow that points at it.
  const lamp = note.locator('svg[data-arrow="lamp"]');
  await expect(lamp).toBeVisible();
  const point = await lamp.evaluate((svg: SVGSVGElement) => {
    const box = svg.getBoundingClientRect();
    const numbers = (value: string) => value.split(" ").map(parseFloat);
    const [tipX, tipY] = numbers(
      svg.querySelector<SVGPathElement>("[data-burst]")!.style.transformOrigin,
    );
    const [tailX, tailY] = numbers(svg.style.transformOrigin);
    const length = Math.hypot(tipX - tailX, tipY - tailY);
    return [
      box.left + tipX + ((tipX - tailX) / length) * 34,
      box.top + tipY + ((tipY - tailY) / length) * 34,
    ] as const;
  });
  await page.mouse.move(point[0] - 4, point[1] - 4);
  await page.mouse.move(...point);
  await page.mouse.click(...point);
  // Every arrow runs into its object and the words lift away; none of it
  // is dropped in one frame.
  await expect(note).toHaveAttribute("data-state", "gone", {
    timeout: ci(3000),
  });
  await expect(note.locator("svg[data-arrow] path").nth(1)).toHaveCSS(
    "animation-name",
    "callout-erase",
  );
  await expect(note.locator("[data-callout-title]")).toHaveCSS(
    "animation-name",
    "callout-lift",
  );
  await expect(note).toBeHidden();
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
  await expect(note.locator("[data-callout-title]")).toHaveText(
    "Objelere tıklamayı dene",
  );
  await expect(note.locator("[data-callout-note]")).toHaveText("müzik çalar");
  const stroke = note.locator("svg[data-arrow] path").nth(1);
  await expect(stroke).toHaveCSS("animation-name", "none");
  await expect(stroke).toHaveCSS("stroke-dashoffset", "0px");
  // No taps under the pause.
  await page.waitForTimeout(2500);
  expect(Number((await canvas(page).getAttribute("data-teases")) ?? 0)).toBe(0);
});
