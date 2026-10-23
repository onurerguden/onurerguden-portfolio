import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getProjects, sharedFacts } from "../../src/lib/content";

for (const locale of ["en", "tr"] as const) {
  test(`${locale}: case author and code evidence remain accessible without JavaScript`, async ({
    browser,
    page,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      reducedMotion: "reduce",
      viewport: page.viewportSize(),
    });
    const noJs = await context.newPage();
    try {
      for (const project of getProjects(locale).filter(
        (item) => item.caseStudy,
      )) {
        const response = await noJs.goto(
          new URL(
            `/${locale}/projects/${project.slug}`,
            testInfo.project.use.baseURL,
          ).href,
        );
        expect(response?.status()).toBe(200);
        const header = noJs.locator("main header");
        // The breadcrumb also names me; the byline is the author link.
        const author = header.locator('a[rel="author"]');
        await expect(author).toHaveText(sharedFacts.name);
        await expect(author).toHaveAttribute("href", `/${locale}#about`);
        await expect(author).toHaveAttribute("rel", "author");
        await expect(author).toBeVisible();
        await author.focus();
        await expect(author).toBeFocused();
        await expect(
          header.getByRole("link", {
            name: "GitHub: onurerguden",
            exact: true,
          }),
        ).toHaveAttribute("href", sharedFacts.github);
        if (project.repoUrl) {
          await expect(
            noJs.getByRole("link", {
              name: new URL(project.repoUrl).pathname.slice(1),
              exact: true,
            }),
          ).toHaveAttribute("href", project.repoUrl);
        }
        const codeLinks = noJs.locator('article a[href*="github.com/"]');
        if (project.slug === "water-safety") {
          await expect(
            noJs.locator(
              `article a[href="${sharedFacts.publication.sourceUrl}"]`,
            ),
          ).toBeVisible();
          await expect(
            noJs.locator(`article a[href="/${locale}/research"]`),
          ).toBeVisible();
        }
        if (["course-intelligence", "gymrap-ai-coach"].includes(project.slug)) {
          expect(await codeLinks.count()).toBeGreaterThanOrEqual(3);
          for (const link of await codeLinks.all()) {
            expect(await link.getAttribute("href")).toMatch(
              /^https:\/\/github\.com\/onurerguden\/[\w-]+\/(blob|tree)\/[a-f0-9]{40}\//,
            );
            await link.focus();
            await expect(link).toBeFocused();
          }
        }
        expect(
          await noJs.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        // axe needs browser scripts and timers; audit the same route in the
        // normal context after verifying its actual no-JavaScript content.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`/${locale}/projects/${project.slug}`);
        const audit = await new AxeBuilder({ page })
          .include("main")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(audit.violations, project.slug).toEqual([]);
      }
    } finally {
      await context.close();
    }
  });
}
