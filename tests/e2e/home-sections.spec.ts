import { test, expect } from "@playwright/test";
import { ci } from "./helpers";
import AxeBuilder from "@axe-core/playwright";

const order = [
  "services",
  "experience",
  "stack",
  "about",
  "work",
  "research",
  "activity",
  "contact",
];

test("home sections follow the story order after the journey", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  const ids = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "#journey-content ~ * section[id], main > section[id], main > [data-sheet][id]",
      ),
    ].map((section) => section.id),
  );
  expect(ids.filter((id) => order.includes(id))).toEqual(order);
  await expect(page.locator("main h1")).toHaveCount(1);
});

test("the Sections menu opens, navigates and closes from the keyboard", async ({
  page,
}) => {
  await page.goto("/en");
  const button = page.getByRole("button", { name: "Sections" });
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const menu = page.locator("#journey-sections-menu");
  await expect(menu.getByRole("link", { name: "What I do" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  await menu.getByRole("link", { name: "What I do" }).click();
  await expect(page).toHaveURL(/#services$/);
  await expect(menu).toBeHidden();
  // Headless Chromium draws the desk with software WebGL (SwiftShader), so
  // the smooth scroll past it can stall frames for a couple of seconds.
  await expect(page.locator("#services-title")).toBeInViewport({
    timeout: ci(15000),
  });
});

test("pausing motion says what it did and lasts for this visit only", async ({
  page,
  context,
}) => {
  await page.goto("/tr");
  await page.getByRole("button", { name: "Bölümler" }).click();
  const menu = page.locator("#journey-sections-menu");
  await menu.getByRole("button", { name: "Hareketi duraklat" }).click();
  await expect(
    menu.getByRole("button", { name: "Hareketi sürdür" }),
  ).toBeVisible();
  await expect(menu.getByRole("status").first()).toHaveText(
    "Hareket duraklatıldı",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-paused",
    "true",
  );
  // A reload is the same visit.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-paused",
    "true",
  );
  // A new visit starts moving again.
  const later = await context.newPage();
  await later.goto("/tr");
  await expect(later.locator("html")).toHaveAttribute(
    "data-motion-paused",
    "false",
  );
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`deep links land on their section (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/en#services");
    await page.waitForTimeout(1500);
    await expect(page.locator("#services-title")).toBeInViewport();
    await page.goto("/tr#contact");
    await page.waitForTimeout(1500);
    await expect(page.locator("#contact-title")).toBeInViewport();
  });
}

test("giant titles fit their width in both languages", async ({ page }) => {
  for (const locale of ["en", "tr"]) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const overflowing = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".giant-title")]
        .filter((title) => title.scrollWidth > title.clientWidth + 1)
        .map((title) => title.textContent),
    );
    expect(overflowing).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
  }
});

test("the nav docks after the journey on touch screens", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Fine pointers keep the top-edge reveal.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  const nav = page.getByRole("navigation", { name: "Journey sections" });
  await page.locator("#experience").scrollIntoViewIfNeeded();
  await expect(nav).toHaveAttribute("data-docked", "true");
  await page.evaluate(() => scrollBy({ top: -300, behavior: "instant" }));
  await expect(nav).toHaveAttribute("data-scroll-hidden", "false");
  await expect(nav.getByRole("button", { name: "Sections" })).toBeInViewport();
});

test("sections pass axe with scroll-linked reveals active", async ({
  page,
}) => {
  await page.goto("/tr");
  // The desk replaces the static sections with its anchors once measured.
  await page.locator("[data-story]").waitFor();
  for (const id of order) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
  }
  expect(
    (
      await new AxeBuilder({ page })
        .include(order.map((id) => `#${id}`))
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`the home page hydrates without mismatches (${reducedMotion})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion });
    for (const locale of ["en", "tr"]) {
      await page.goto(`/${locale}`);
      await page.waitForTimeout(1200);
    }
    // React reports a server/client render difference as error #418/#423.
    expect(errors).toEqual([]);
  });
}

test("older desk chapter links land on the sections that hold that content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [alias, id] of [
    ["desk-story-0", "work"],
    ["desk-story-1", "research"],
    ["desk-story-2", "about"],
  ]) {
    await page.goto(`/en#${alias}`);
    await expect(page.locator(`#${id}-title`)).toBeInViewport({
      timeout: ci(10000),
    });
  }
});

test("research, education and the name read before any 3D", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await expect(
    page.getByRole("heading", { level: 1, name: "Onur Ergüden, AI engineer" }),
  ).toHaveCount(1);
  const research = page.locator("#research");
  await expect(
    research.getByText("Accepted · publication pending"),
  ).toBeVisible();
  await expect(research.locator("ol li")).toHaveCount(3);
  await expect(
    research.locator("strong", { hasText: "O. Ergüden" }),
  ).toHaveCount(1);
  const facts = page.locator("#about dl");
  await expect(facts).toContainText("BSc Software Engineering");
  await expect(facts).toContainText("3.30 / 4.00");
  await expect(facts).toContainText("Google AI & Technology Academy");
  // One primary action; the CV and research follow it.
  const actions = page.locator("#about").getByRole("link");
  await expect(actions.filter({ hasText: "Contact me" })).toHaveCount(1);
  await expect(actions.filter({ hasText: /CV/ })).toHaveCount(1);
});

test("contact offers the address, a copy button and the CV request", async ({
  page,
  context,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en#contact");
  const contact = page.locator("#contact");
  const mail = contact.getByRole("link", { name: "onurerguden5@gmail.com" });
  await expect(mail).toHaveAttribute("href", "mailto:onurerguden5@gmail.com");
  await expect(
    contact.getByRole("link", { name: "Request my CV" }),
  ).toHaveAttribute("href", /^mailto:.*subject=CV%20request$/);
  test.skip(
    browserName !== "chromium",
    "Clipboard access is granted in Chromium.",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await contact.getByRole("button", { name: "Copy address" }).click();
  await expect(contact.getByRole("button", { name: "Copied" })).toBeVisible();
  await expect(contact.getByRole("status")).toHaveText("Email address copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "onurerguden5@gmail.com",
  );
});
