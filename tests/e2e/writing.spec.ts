import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getPosts } from "../../src/lib/writing";

for (const locale of ["en", "tr"] as const) {
  const post = getPosts(locale)[0];

  test(`${locale}: the Atom feed is valid XML with every article`, async ({
    request,
    page,
  }) => {
    const response = await request.get(`/${locale}/writing/feed.xml`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain(
      "application/atom+xml",
    );
    const xml = await response.text();
    await page.goto(`/${locale}/writing`);
    const parsed = await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, "application/xml");
      return {
        error: doc.querySelector("parsererror")?.textContent ?? null,
        entries: doc.getElementsByTagName("entry").length,
      };
    }, xml);
    expect(parsed.error).toBeNull();
    expect(parsed.entries).toBe(getPosts(locale).length);
    await expect(
      page.locator('link[rel="alternate"][type="application/atom+xml"]'),
    ).toHaveAttribute("href", new RegExp(`/${locale}/writing/feed\\.xml$`));
  });

  test(`${locale}: an article reads without JavaScript, credits me and passes axe`, async ({
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
        new URL(`/${locale}/writing/${post.slug}`, testInfo.project.use.baseURL)
          .href,
      );
      expect(response?.status()).toBe(200);
      await expect(noJs.locator("main h1")).toHaveText(post.title);
      await expect(noJs.locator('main a[rel="author"]')).toHaveAttribute(
        "href",
        `/${locale}#about`,
      );
      await expect(
        noJs.locator(`main time[datetime="${post.published}"]`).first(),
      ).toBeVisible();
      await expect(noJs.locator('meta[property="og:type"]')).toHaveAttribute(
        "content",
        "article",
      );
    } finally {
      await context.close();
    }
    await page.goto(`/${locale}/writing/${post.slug}`);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}
