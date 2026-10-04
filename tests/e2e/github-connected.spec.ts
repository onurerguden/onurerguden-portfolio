import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.skip(
  process.env.PLAYWRIGHT_GITHUB_LIVE !== "1",
  "Requires preview:github and the owner's authenticated CLI.",
);

for (const locale of ["en", "tr"]) {
  test(`${locale}: real GitHub activity and public repositories are connected`, async ({
    page,
    request,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = await request.get("/api/github/activity");
    expect(response.status()).toBe(200);
    const snapshot = await response.json();
    expect(snapshot.version).toBe(1);
    expect(Date.now() - Date.parse(snapshot.syncedAt)).toBeLessThan(
      10 * 60_000,
    );
    expect(snapshot.years.at(-1).year).toBe(new Date().getUTCFullYear());
    for (const year of snapshot.years)
      expect(
        year.days.reduce((sum: number, count: number) => sum + count, 0),
      ).toBe(year.total);
    expect(
      snapshot.years.reduce(
        (sum: number, year: { total: number }) => sum + year.total,
        0,
      ),
    ).toBe(snapshot.allTime);
    expect(JSON.stringify(snapshot)).not.toMatch(
      /gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|"(?:token|authorization|email|payload)":/i,
    );
    expect(
      (
        await request.get("/api/github/activity", {
          headers: { "If-None-Match": response.headers().etag },
        })
      ).status(),
    ).toBe(304);

    await page.goto(`/${locale}#activity`);
    const section = page.locator("#activity");
    await expect(section.locator("dd")).toHaveCount(3);
    expect(
      await section
        .locator("dd")
        .evaluateAll((values) =>
          values.every((value) => value.scrollWidth <= value.clientWidth + 1),
        ),
    ).toBe(true);
    await expect(
      section.getByText(
        locale === "en" ? /Synced with GitHub/ : /GitHub ile eşitlendi/,
      ),
    ).toBeVisible();
    await expect(section.locator("dd").first()).toHaveText(
      new Intl.NumberFormat(locale === "en" ? "en-GB" : "tr-TR").format(
        snapshot.rolling.total,
      ),
    );
    const grid = section.getByRole("grid");
    const current = grid.locator('[role="gridcell"][tabindex="0"]');
    await current.focus();
    const before = await current.getAttribute("aria-label");
    await page.keyboard.press("ArrowLeft");
    await expect(grid.locator('[role="gridcell"]:focus')).not.toHaveAttribute(
      "aria-label",
      before!,
    );
    expect(
      (
        await new AxeBuilder({ page })
          .include("#activity")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await testInfo.attach("github-compact", {
      body: await section.screenshot({ type: "jpeg", quality: 85 }),
      contentType: "image/jpeg",
    });

    await page.goto(`/${locale}/projects#github-title`);
    const repos = page.locator("section[aria-labelledby='github-title']");
    await expect(
      repos.getByText(
        locale === "en"
          ? /Repository metadata from GitHub/
          : /GitHub’dan depo bilgileri/,
      ),
    ).toBeVisible();
    const links = repos.locator("h3 a");
    expect(await links.count()).toBeGreaterThan(0);
    for (const href of await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    ))
      expect(href).toMatch(/^https:\/\/github\.com\/onurerguden\//);
    expect(
      (
        await new AxeBuilder({ page })
          .include("section[aria-labelledby='github-title']")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}
