import { test, expect, type Locator, type Page } from "@playwright/test";
import { getCertificates } from "../../src/lib/home-content";
import AxeBuilder from "@axe-core/playwright";

/** Presses the nav's pause toggle without moving focus. */
const toggleMotion = (page: Page) =>
  page.evaluate(() =>
    document
      .querySelector<HTMLButtonElement>(
        "#journey-sections-menu button[data-paused]",
      )!
      .click(),
  );

const metadataPosition = (card: Locator) =>
  card.evaluate((button) => {
    const outer = button.getBoundingClientRect();
    const meta = button
      .querySelector("[data-certificate-meta]")!
      .getBoundingClientRect();
    return {
      x: meta.x - outer.x,
      y: meta.y - outer.y,
      width: meta.width,
      height: meta.height,
    };
  });

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
      await expect(
        card.locator('[data-certificate-sheet][aria-hidden="true"]'),
      ).toHaveCount(2);
      await expect(card.locator("img")).toHaveCSS("object-fit", "contain");
      const frame = await card
        .locator('[data-certificate-sheet="front"]')
        .boundingBox();
      expect(frame!.width / frame!.height).toBeCloseTo(4 / 3, 2);
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

  test(`${locale}: paper stacks answer hover and keyboard focus while text stays still`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The decorative fan is only enabled for fine-pointer devices.",
    );
    const items = getCertificates(locale);
    test.skip(items.length === 0, "No certificates have been added yet.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}#certificates`);
    const grid = page.locator("#certificates section > div > ul");
    await expect(grid).toHaveAttribute("data-motion-still", "false");
    const card = grid.getByRole("button", { name: items[0].title });
    const front = card.locator('[data-certificate-sheet="front"]');
    const rear = card.locator('[data-certificate-sheet="rear"]');
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(front).toHaveCSS("transform", "none");
    const closedRear = await rear.evaluate(
      (sheet) => getComputedStyle(sheet).transform,
    );
    const meta = await metadataPosition(card);
    await card.hover();
    await expect
      .poll(() =>
        rear.evaluate(
          (sheet) =>
            new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m41,
        ),
      )
      .toBeCloseTo(-16, 1);
    await expect(front).not.toHaveCSS("transform", "none");
    expect(await metadataPosition(card)).toEqual(meta);
    expect(
      await card.evaluate((button) => {
        const bounds = button.getBoundingClientRect();
        return [...button.querySelectorAll("[data-certificate-sheet]")].every(
          (sheet) => {
            const rect = sheet.getBoundingClientRect();
            return (
              rect.left >= bounds.left &&
              rect.right <= bounds.right &&
              rect.top >= bounds.top
            );
          },
        );
      }),
    ).toBe(true);
    await testInfo.attach("certificate-stack-open", {
      body: await page
        .locator("#certificates")
        .screenshot({ type: "jpeg", quality: 85 }),
      contentType: "image/jpeg",
    });
    await page.mouse.move(0, 0);
    await expect(front).toHaveCSS("transform", "none");
    await expect(rear).toHaveCSS("transform", closedRear);

    await page.keyboard.press("Tab");
    await card.focus();
    await expect(card).toBeFocused();
    await expect(card).toHaveCSS("outline-width", "3px");
    await expect(front).not.toHaveCSS("transform", "none");
    expect(await metadataPosition(card)).toEqual(meta);
    const focusedAudit = await new AxeBuilder({ page })
      .include("#certificates")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(focusedAudit.violations).toEqual([]);

    // Motion can be paused from the nav while this card keeps focus.
    await toggleMotion(page);
    await expect(grid).toHaveAttribute("data-motion-still", "true");
    await expect(card).toBeFocused();
    await expect(front).toHaveCSS("transform", "none");
    await expect(front).toHaveCSS("transition-duration", "0s");
    await expect(rear).toHaveCSS("transform", closedRear);
    expect(await metadataPosition(card)).toEqual(meta);
    const pausedAudit = await new AxeBuilder({ page })
      .include("#certificates")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(pausedAudit.violations).toEqual([]);

    await toggleMotion(page);
    await expect(grid).toHaveAttribute("data-motion-still", "false");
    await expect(front).not.toHaveCSS("transform", "none");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(grid).toHaveAttribute("data-motion-still", "true");
    await expect(front).toHaveCSS("transform", "none");
    await expect(front).toHaveCSS("transition-duration", "0s");
    await expect(rear).toHaveCSS("transform", closedRear);
    expect(await metadataPosition(card)).toEqual(meta);
  });

  test(`${locale}: certificate lightbox supports keyboard navigation, verified links and focus return`, async ({
    page,
  }, testInfo) => {
    const items = getCertificates(locale);
    test.skip(items.length === 0, "No certificates have been added yet.");
    await page.goto(`/${locale}#certificates`);
    const card = page
      .locator("#certificates")
      .getByRole("button", { name: items[0].title });
    await card.focus();
    if (testInfo.project.name.startsWith("mobile-")) {
      const front = card.locator('[data-certificate-sheet="front"]');
      await expect(front).toHaveCSS("transform", "none");
      await expect(front).toHaveCSS("transition-duration", "0s");
    }
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

test("bilingual certificate columns and text fit every responsive boundary", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Resize one desktop session to cover the responsive breakpoints.",
  );
  test.skip(
    getCertificates("en").length === 0,
    "No certificates have been added yet.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const locale of ["en", "tr"] as const) {
    await page.goto(`/${locale}#certificates`);
    const cards = page.locator("#certificates ul > li");
    for (const [width, columns] of [
      [1440, 3],
      [1100, 3],
      [1099, 2],
      [900, 2],
      [700, 2],
      [699, 1],
      [390, 1],
    ] as const) {
      await page.setViewportSize({ width, height: 1000 });
      const bounds = await cards.evaluateAll((items) =>
        items.map((item) => {
          const rect = item.getBoundingClientRect();
          const button = item.querySelector("button")!;
          const card = button.getBoundingClientRect();
          const sheets = [
            ...button.querySelectorAll("[data-certificate-sheet]"),
          ];
          const texts = [
            ...item.querySelectorAll<HTMLElement>(
              "[data-certificate-meta] strong, [data-certificate-meta] > span, p",
            ),
          ];
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            title: texts[0].textContent,
            closed:
              getComputedStyle(
                button.querySelector('[data-certificate-sheet="front"]')!,
              ).transform === "none",
            sheetsFit: sheets.every((sheet) => {
              const edge = sheet.getBoundingClientRect();
              return (
                edge.left >= card.left - 1 &&
                edge.right <= card.right + 1 &&
                edge.top >= card.top - 1 &&
                edge.bottom <= card.bottom + 1
              );
            }),
            textFits: texts.every((text) => {
              const edge = text.getBoundingClientRect();
              return (
                text.scrollWidth <= text.clientWidth + 1 &&
                text.scrollHeight <= text.clientHeight + 1 &&
                edge.left >= rect.left - 1 &&
                edge.right <= rect.right + 1
              );
            }),
          };
        }),
      );
      const firstRow = bounds.filter(
        (card) => Math.abs(card.y - bounds[0].y) < 1,
      );
      expect(firstRow, `${locale} at ${width}px`).toHaveLength(columns);
      for (const card of bounds) {
        const label = `${locale}: ${card.title} at ${width}px`;
        expect(card.width, label).toBeCloseTo(bounds[0].width, 1);
        expect(card.x, label).toBeGreaterThanOrEqual(0);
        expect(card.x + card.width, label).toBeLessThanOrEqual(width);
        expect(card.closed, label).toBe(true);
        expect(card.sheetsFit, label).toBe(true);
        expect(card.textFits, label).toBe(true);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${locale} at ${width}px`,
      ).toBe(true);
    }
  }
});

test("without JavaScript the six certificate stacks keep their closed layout", async ({
  browser,
  baseURL,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "The server-rendered gallery only needs one browser check.",
  );
  const items = getCertificates("en");
  test.skip(items.length === 0, "No certificates have been added yet.");
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/en#certificates`);
    const grid = page.locator("#certificates section > div > ul");
    await expect(grid).toHaveAttribute("data-motion-still", "true");
    await expect(grid.locator("li")).toHaveCount(items.length);
    const card = grid.getByRole("button", { name: items[0].title });
    // With page scripts disabled, bypass the injected animation-frame
    // stability probe; the assertion still checks the real hovered CSS.
    await card.hover({ force: true });
    await expect(card.locator('[data-certificate-sheet="front"]')).toHaveCSS(
      "transform",
      "none",
    );
    await expect(card).toHaveAccessibleDescription(items[0].description!);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
