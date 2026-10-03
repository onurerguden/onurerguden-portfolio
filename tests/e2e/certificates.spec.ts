import { test, expect } from "@playwright/test";
import { getCertificates } from "../../src/lib/home-content";
import AxeBuilder from "@axe-core/playwright";

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

for (const locale of ["en", "tr"] as const) {
  test(`${locale}: selected certificates have readable images, clear descriptions and navigation`, async ({
    page,
  }) => {
    const items = getCertificates(locale);
    test.skip(items.length === 0, "No certificates have been added yet.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}#certificates`);
    const section = page.locator("#certificates");
    await expect(section.locator("ul > li")).toHaveCount(items.length);
    for (const item of items) {
      const card = section.getByRole("button", { name: item.title });
      await card.scrollIntoViewIfNeeded();
      await expect(card).toHaveAccessibleDescription(item.description!);
      await expect
        .poll(() =>
          card
            .locator("img")
            .evaluate(
              (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
            ),
        )
        .toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const menu = page.getByRole("button", {
      name: locale === "en" ? "Sections" : "Bölümler",
    });
    // Touch navigation reveals on focus as well as upward scrolling.
    await menu.focus();
    await menu.press("Enter");
    await expect(
      page.locator("#journey-sections-menu").getByRole("link", {
        name: locale === "en" ? "Certificates" : "Sertifikalar",
        exact: true,
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    const audit = await new AxeBuilder({ page })
      .include("#certificates")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });

  test(`${locale}: certificate lightbox supports keyboard navigation, verified links and focus return`, async ({
    page,
  }) => {
    const items = getCertificates(locale);
    test.skip(items.length === 0, "No certificates have been added yet.");
    await page.goto(`/${locale}#certificates`);
    const card = page
      .locator("#certificates")
      .getByRole("button", { name: items[0].title });
    await card.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole("button", {
      name: locale === "en" ? "Close" : "Kapat",
      exact: true,
    });
    await expect(close).toBeFocused();
    // A modal makes background controls inert. Native Tab wrapping may stop
    // at the browser chrome before returning to the dialog.
    await card.focus();
    await expect(close).toBeFocused();
    for (const item of items) {
      await expect(dialog.getByRole("heading")).toHaveText(item.title);
      await expect(dialog.getByRole("img")).toHaveAttribute("alt", item.alt);
      await expect(
        dialog.getByRole("link", {
          name: locale === "en" ? "Open full-size image" : "Tam boy görseli aç",
        }),
      ).toHaveAttribute("href", item.image.src);
      const verify = dialog.getByRole("link", {
        name: locale === "en" ? "Verify credential" : "Belgeyi doğrula",
      });
      if (item.credentialUrl)
        await expect(verify).toHaveAttribute("href", item.credentialUrl);
      else await expect(verify).toHaveCount(0);
      await page.keyboard.press("ArrowRight");
    }
    await expect(dialog.getByRole("heading")).toHaveText(items[0].title);
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.getByRole("heading")).toHaveText(items.at(-1)!.title);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(card).toBeFocused();
  });
}
