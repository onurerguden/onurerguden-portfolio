import { test, expect } from "@playwright/test";
import { getCertificates } from "../../src/lib/home-content";

test("certificates stay out of the page and menus until one is added", async ({
  page,
}) => {
  test.skip(
    getCertificates("en").length > 0,
    "Covered by the gallery test once certificates exist.",
  );
  await page.goto("/en");
  await expect(page.locator("#certificates")).toHaveCount(0);
  await page.getByRole("button", { name: "Sections" }).click();
  await expect(
    page
      .locator("#journey-sections-menu")
      .getByRole("link", { name: "Certificates" }),
  ).toHaveCount(0);
});

test("the certificate gallery opens a keyboard-friendly lightbox", async ({
  page,
}) => {
  const items = getCertificates("en");
  test.skip(items.length === 0, "No certificates have been added yet.");
  await page.goto("/en#certificates");
  const section = page.locator("#certificates");
  const cards = section.getByRole("button", {
    name: new RegExp(items[0].title),
  });
  await cards.first().focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText(items[0].title);
  if (items.length > 1) {
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByRole("heading")).toHaveText(items[1].title);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(cards.first()).toBeFocused();
});
