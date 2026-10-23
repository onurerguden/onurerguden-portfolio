import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { sharedFacts } from "../../src/lib/content";
import { getIdentity } from "../../src/lib/identity";

for (const locale of ["en", "tr"] as const) {
  test(`${locale}: About reads without JavaScript and names me first`, async ({
    browser,
    page,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: page.viewportSize(),
    });
    const noJs = await context.newPage();
    try {
      const response = await noJs.goto(
        new URL(`/${locale}/about`, testInfo.project.use.baseURL).href,
      );
      expect(response?.status()).toBe(200);
      const identity = getIdentity(locale);
      const main = noJs.locator("main");
      await expect(main.locator("h1")).toHaveCount(1);
      await expect(main.locator("h1")).toContainText(sharedFacts.name, {
        ignoreCase: true,
      });
      await expect(main).toContainText(identity.lead);
      await expect(main).toContainText(sharedFacts.work.company);
      await expect(main).toContainText(sharedFacts.teaching.company);
      // My profiles are linked once per page, in the footer, as rel="me".
      for (const profile of sharedFacts.profiles)
        await expect(
          noJs.locator(`footer a[rel="me"][href="${profile.url}"]`),
        ).toHaveCount(1);
      const data = JSON.parse(
        (await noJs
          .locator('script[type="application/ld+json"]')
          .textContent()) as string,
      ) as { "@graph": { "@type": string; mainEntity?: unknown }[] };
      expect(
        data["@graph"].find((node) => node["@type"] === "ProfilePage")
          ?.mainEntity,
      ).toEqual({ "@id": expect.stringMatching(/\/#person$/) });
    } finally {
      await context.close();
    }
  });

  test(`${locale}: About is reachable from the nav and passes axe`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/research`);
    await page
      .getByRole("navigation", {
        name: locale === "en" ? "Main navigation" : "Ana gezinme",
      })
      .getByRole("link", { name: locale === "en" ? "About" : "Hakkımda" })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/about$`));
    await expect(
      page
        .getByRole("navigation", {
          name: locale === "en" ? "Main navigation" : "Ana gezinme",
        })
        .getByRole("link", { name: locale === "en" ? "About" : "Hakkımda" }),
    ).toHaveAttribute("aria-current", "page");
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}
