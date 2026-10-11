import { test, expect, type Page } from "@playwright/test";

// The conversion counter (src/lib/event-beacon.ts) loads once the page is
// idle and sends one beacon per counted action to /api/event.
function beacons(page: Page) {
  const sent: unknown[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/event")
      sent.push(JSON.parse(request.postData() ?? "null"));
  });
  return sent;
}

// Links leave the page; the counter listens in the capture phase, so a
// listener that cancels the navigation afterwards does not hide the click.
const stayOnPage = (page: Page) =>
  page.evaluate(() =>
    document.addEventListener("click", (event) => event.preventDefault()),
  );

test("contact links count once each, with where they were used", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const sent = beacons(page);
  await page.goto("/en");
  await stayOnPage(page);
  const contact = page.locator("#contact");
  await contact.scrollIntoViewIfNeeded();
  const linkedin = contact.getByRole("link", { name: "LinkedIn" });
  // The counter arrives at idle; click until it has.
  await expect(async () => {
    await linkedin.click();
    expect(sent).toContainEqual({
      name: "linkedin_click",
      location: "contact",
    });
  }).toPass({ timeout: 10000 });
  sent.length = 0;
  await contact.getByRole("link", { name: "GitHub" }).click();
  await page.locator("footer").getByRole("link", { name: "LinkedIn" }).click();
  await expect
    .poll(() => sent)
    .toEqual([
      { name: "github_click", location: "contact" },
      { name: "linkedin_click", location: "footer" },
    ]);
});

test("reaching the end of a case study counts one read", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const sent = beacons(page);
  await page.goto("/tr/projects/kuyumcum");
  // Let the counter load before the reader reaches the end.
  await page.waitForTimeout(3500);
  await page.locator("main article > :last-child").scrollIntoViewIfNeeded();
  await expect
    .poll(() => sent)
    .toEqual([{ name: "case_study_read", project: "kuyumcum" }]);
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator("main article > :last-child").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  expect(sent).toHaveLength(1);
});

test("nothing is sent without a counted action or under Global Privacy Control", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const sent = beacons(page);
  const insights: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/_vercel/insights"))
      insights.push(request.url());
  });
  await page.goto("/en");
  await page.waitForTimeout(4000);
  expect(sent).toEqual([]);
  // Page views are counted on production deployments only.
  expect(insights).toEqual([]);

  await page.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
      get: () => true,
    }),
  );
  await page.goto("/en");
  await stayOnPage(page);
  await page.waitForTimeout(4000);
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await page
    .locator("#contact")
    .getByRole("link", { name: "LinkedIn" })
    .click();
  await page.waitForTimeout(500);
  expect(sent).toEqual([]);
});
