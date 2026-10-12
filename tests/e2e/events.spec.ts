import { test, expect, type Page } from "@playwright/test";

// The conversion counter loads on the first interaction and sends one
// beacon per counted action to /api/event.
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
  // A click that lands while the deferred module loads must replay only once.
  await linkedin.click();
  await expect
    .poll(() => sent)
    .toEqual([
      {
        name: "linkedin_click",
        location: "contact",
        channel: "direct_or_unknown",
      },
    ]);
  sent.length = 0;
  await contact.getByRole("link", { name: "GitHub" }).click();
  await page.locator("footer").getByRole("link", { name: "LinkedIn" }).click();
  await expect
    .poll(() => sent)
    .toEqual([
      {
        name: "github_click",
        location: "contact",
        channel: "direct_or_unknown",
      },
      {
        name: "linkedin_click",
        location: "footer",
        channel: "direct_or_unknown",
      },
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
    .toEqual([
      {
        name: "case_study_read",
        project: "kuyumcum",
        channel: "direct_or_unknown",
      },
    ]);
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator("main article > :last-child").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  expect(sent).toHaveLength(1);
});

test("client navigation installs each case-read observer without losing the entry channel", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const sent = beacons(page);
  await page.goto("/en?utm_source=chatgpt");
  await page.locator('#work a[href="/en/projects/kuyumcum"]').first().click();
  await expect(page).toHaveURL(/\/en\/projects\/kuyumcum$/);
  const reads: unknown[] = [];
  for (const project of ["kuyumcum", "course-intelligence"]) {
    if (project === "course-intelligence") {
      await page.locator(`a[href="/en/projects/${project}"]`).first().click();
      await expect(page).toHaveURL(/\/en\/projects\/course-intelligence$/);
    }
    const end = page.locator("main article > :last-child");
    await end.scrollIntoViewIfNeeded();
    reads.push({ name: "case_study_read", project, channel: "chatgpt" });
    const recordedReads = () =>
      sent.filter(
        (event) =>
          typeof event === "object" &&
          event !== null &&
          "name" in event &&
          event.name === "case_study_read",
      );
    await expect.poll(recordedReads).toEqual(reads);
    await page.evaluate(() => scrollTo(0, 0));
    await end.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    expect(recordedReads()).toEqual(reads);
  }
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

for (const { referrer, query, channel } of [
  {
    referrer: "https://chatgpt.com/c/private-conversation",
    query: "?utm_source=bing",
    channel: "chatgpt",
  },
  { referrer: "https://claude.ai/", query: "", channel: "claude" },
  {
    referrer: "https://www.google.com.tr/search?q=private-question",
    query: "",
    channel: "google",
  },
  {
    referrer: "https://chatgpt.com.evil.test/private",
    query: "",
    channel: "other_referral",
  },
  {
    referrer: "",
    query: "?utm_source=perplexity&private=do-not-send",
    channel: "perplexity",
  },
]) {
  test(`contact conversion classifies ${channel} without sending source details (${referrer || "campaign"})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const sent = beacons(page);
    await page.goto(
      `/en${query}`,
      referrer ? { referer: referrer } : undefined,
    );
    await stayOnPage(page);
    await page
      .locator("#contact")
      .getByRole("link", { name: "GitHub" })
      .click();
    await expect
      .poll(() => sent)
      .toEqual([{ name: "github_click", location: "contact", channel }]);
    expect(JSON.stringify(sent)).not.toMatch(
      /https:|private|utm_|referrer|visitor/,
    );
  });
}

test("entry is captured before an early copy imports the beacon, with no extra beacon", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async () => {} },
      configurable: true,
    });
  });
  const sent = beacons(page);
  await page.goto("/en?utm_source=chatgpt.com&private=do-not-send");
  // Navigation Timing still identifies the original document entry even if
  // the eager module loaded after the history replacement.
  await page.evaluate(() =>
    history.replaceState(null, "", "/en?utm_source=bing"),
  );
  await page
    .getByRole("button", { name: "Copy address", exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(
    page.getByRole("button", { name: "Copied", exact: true }),
  ).toBeAttached();
  await expect
    .poll(() => sent)
    .toEqual([{ name: "email_copy", location: "contact", channel: "chatgpt" }]);
});

test("client navigation preserves the document entry and a language document starts internal", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const sent = beacons(page);
  await page.goto("/en?utm_source=chatgpt.com");
  await page.evaluate(() =>
    Object.defineProperty(window, "analyticsDocumentMarker", { value: true }),
  );
  await page.locator('a[href="/en/projects/kuyumcum"]').first().click();
  await expect(page).toHaveURL(/\/en\/projects\/kuyumcum$/);
  expect(await page.evaluate(() => "analyticsDocumentMarker" in window)).toBe(
    true,
  );
  await stayOnPage(page);
  await page.locator("footer").getByRole("link", { name: "LinkedIn" }).click();
  await expect
    .poll(() =>
      sent.filter(
        (event) => (event as { name: string }).name === "linkedin_click",
      ),
    )
    .toEqual([
      { name: "linkedin_click", location: "footer", channel: "chatgpt" },
    ]);
  // The language link deliberately creates a fresh document with <html lang>.
  // Remove the test's navigation-cancelling listener by reloading the page.
  await page.reload();
  sent.length = 0;
  await page.getByRole("link", { name: "Türkçeye geç" }).click();
  await expect(page).toHaveURL(/\/tr\/projects\/kuyumcum/);
  await stayOnPage(page);
  await page.locator("footer").getByRole("link", { name: "LinkedIn" }).click();
  await expect
    .poll(() =>
      sent.filter(
        (event) => (event as { name: string }).name === "linkedin_click",
      ),
    )
    .toEqual([
      { name: "linkedin_click", location: "footer", channel: "internal" },
    ]);
});

for (const signal of ["globalPrivacyControl", "doNotTrack"] as const) {
  test(`${signal} prevents both early clipboard and link beacons`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((signal) => {
      Object.defineProperty(Navigator.prototype, signal, {
        get: () => (signal === "globalPrivacyControl" ? true : "1"),
        configurable: true,
      });
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: async () => {} },
        configurable: true,
      });
    }, signal);
    const sent = beacons(page);
    await page.goto("/en?utm_source=chatgpt.com");
    await page
      .getByRole("button", { name: "Copy address", exact: true })
      .evaluate((button: HTMLButtonElement) => button.click());
    await expect(
      page.getByRole("button", { name: "Copied", exact: true }),
    ).toBeAttached();
    await stayOnPage(page);
    await page
      .locator("#contact")
      .getByRole("link", { name: "LinkedIn" })
      .click();
    await page.waitForTimeout(500);
    expect(sent).toEqual([]);
  });
}
