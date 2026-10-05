import { test, expect, type Page } from "@playwright/test";
import { ci } from "./helpers";
import AxeBuilder from "@axe-core/playwright";

const DAY = 86_400_000;
const POLL = 3 * 60_000;

/**
 * A deterministic snapshot shaped like the API's response. `extra`
 * contributions land on the last day, which both calendars include.
 */
function fixture({
  extra = 0,
  syncedAt = Date.now() - 4 * 60_000,
  rollingStart = "2025-09-29",
}: { extra?: number; syncedAt?: number; rollingStart?: string } = {}) {
  const year = (y: number, start: string, length: number) => {
    const days = Array.from({ length }, (_, i): number =>
      i % 5 === 0 ? 3 : i % 3 === 0 ? 1 : 0,
    );
    return { year: y, start, days, total: days.reduce((a, b) => a + b, 0) };
  };
  const y2025 = year(2025, "2025-01-01", 365);
  const y2026 = year(2026, "2026-01-01", 272);
  y2026.days[271] += extra;
  y2026.total += extra;
  const rolling = year(2026, rollingStart, 366);
  rolling.days[365] += extra;
  rolling.total += extra;
  return {
    version: 1,
    syncedAt: new Date(syncedAt).toISOString(),
    rolling: {
      ...rolling,
      commits: 199,
      pullRequests: 19,
      reviews: 3,
      issues: 0,
      restricted: 774,
    },
    years: [y2025, y2026],
    allTime: y2025.total + y2026.total,
    streaks: { current: 2, longest: 9, longestEnd: "2026-03-10" },
    busiestWeekday: 2,
    languages: [
      { name: "Python", share: 48.5 },
      { name: "TypeScript", share: 30 },
      { name: "Java", share: 21.5 },
    ],
    events: [
      {
        id: "1",
        kind: "push",
        repo: "onurerguden/onurerguden-portfolio",
        at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        commits: 3,
        branch: "main",
      },
      {
        id: "2",
        kind: "pull_request",
        repo: "onurerguden/TaskFoo",
        at: new Date(Date.now() - 9 * DAY).toISOString(),
        action: "merged",
        number: 7,
      },
    ],
  };
}

async function serve(page: Page, bodies: object[]) {
  let call = 0;
  await page.route("**/api/github/activity", (route) => {
    const body = bodies[Math.min(call, bodies.length - 1)];
    call++;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { etag: `"activity-${call}"` },
      body: JSON.stringify(body),
    });
  });
}

test("without live data the section says so and links to GitHub", async ({
  page,
}) => {
  // The local server has no Redis, so the first poll gets a 503. It must
  // still finish, or it holds a connection and the page never goes idle.
  const poll = page.waitForEvent("requestfinished", (request) =>
    request.url().endsWith("/api/github/activity"),
  );
  await page.goto("/en#activity");
  const section = page.locator("#activity");
  await expect(
    section.getByText("Live GitHub activity is unavailable right now."),
  ).toBeVisible();
  await expect(
    section.getByRole("link", { name: "See my profile on GitHub" }),
  ).toHaveAttribute("href", "https://github.com/onurerguden");
  await expect(section.locator("dd")).toHaveCount(0);
  await poll;
});

test("a response in an unknown shape leaves the page working", async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  const poll = page.waitForEvent("requestfinished", (request) =>
    request.url().endsWith("/api/github/activity"),
  );
  await serve(page, [{ version: 2, years: "soon", rolling: null }]);
  await page.goto("/en#activity");
  await poll;
  // Two frames give React time to render whatever the poll returned.
  await page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      ),
  );
  const section = page.locator("#activity");
  await expect(
    section.getByText("Live GitHub activity is unavailable right now."),
  ).toBeVisible();
  await expect(page.locator("#contact")).toBeAttached();
  expect(errors).toEqual([]);
});

test("shows totals, a keyboard heatmap and recent activity", async ({
  page,
}) => {
  await serve(page, [fixture()]);
  await page.goto("/en");
  const section = page.locator("#activity");
  await section.scrollIntoViewIfNeeded();
  await expect(
    section.getByText("contributions", { exact: true }),
  ).toBeVisible();
  await expect(
    section.getByText("774 in private repositories", { exact: false }),
  ).toBeVisible();
  await expect(section.locator("dd")).toHaveCount(3);
  await expect(
    section.getByRole("link", {
      name: /Pushed 3 commits to onurerguden-portfolio/,
    }),
  ).toBeVisible();
  await expect(section.getByText("New", { exact: true })).toHaveCount(1);

  const grid = section.getByRole("grid");
  // Month labels never widen a week: every day is the same square.
  const widths = await grid
    .locator('[role="gridcell"]')
    .evaluateAll((cells) =>
      cells.map((cell) => cell.getBoundingClientRect().width),
    );
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(0.5);

  const focusable = grid.locator('[role="gridcell"][tabindex="0"]');
  await expect(focusable).toHaveCount(1);
  await focusable.focus();
  const first = await focusable.getAttribute("aria-label");
  // The last day is a Tuesday: below it is padding, so focus stays put.
  await page.keyboard.press("ArrowDown");
  await expect(grid.locator('[role="gridcell"]:focus')).toHaveAttribute(
    "aria-label",
    first!,
  );
  await page.keyboard.press("ArrowLeft");
  await expect(grid.locator('[role="gridcell"]:focus')).not.toHaveAttribute(
    "aria-label",
    first!,
  );
  await expect(grid.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);

  const rollingStats = await section.locator("dd").allTextContents();
  await section.getByRole("tab", { name: "2025" }).click();
  await expect(section.getByRole("tab", { name: "2025" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(section.getByText(/contributions in 2025\./)).toBeVisible();
  await expect(section.locator("#activity-stats-period")).toHaveText(
    "Last 12 months",
  );
  await expect(section.locator("#activity-stats-period")).toBeVisible();
  expect(await section.locator("dd").allTextContents()).toEqual(rollingStats);
  await page.keyboard.press("ArrowLeft");
  await expect(section.getByRole("tab", { name: "2026" })).toBeFocused();

  expect(
    (
      await new AxeBuilder({ page })
        .include("#activity")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("a deep link below the section stays on target as it grows", async ({
  page,
}) => {
  await serve(page, [fixture()]);
  const polled = page.waitForEvent("requestfinished", (request) =>
    request.url().endsWith("/api/github/activity"),
  );
  await page.goto("/tr#contact");
  await polled;
  // The section grew from one line to the full panel above the target.
  await expect(page.locator("#activity dd")).toHaveCount(3);
  await page.waitForTimeout(500);
  await expect(page.locator("#contact-title")).toBeInViewport();
});

test("Turkish shares put the percent sign first", async ({ page }) => {
  await serve(page, [fixture()]);
  await page.goto("/tr");
  const languages = page.locator("#activity ul").last();
  await expect(languages.getByText("%48,5", { exact: true })).toBeAttached();
  await expect(languages.getByText("%30", { exact: true })).toBeAttached();
});

for (const locale of ["en", "tr"] as const) {
  test(`${locale}: compact panels keep the newest useful events and actual language shares`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const now = Date.now();
    const longRepo = `onurerguden/${"long-repository-name-".repeat(7)}`;
    const newestVisible = now - 60_000;
    await serve(page, [
      {
        ...fixture(),
        languages: [
          { name: "CSS", share: 4.5 },
          { name: "Python", share: 31.1 },
          { name: "Dart", share: 5 },
          { name: "TypeScript", share: 43.2 },
          { name: "Kotlin", share: 2 },
          { name: "Java", share: 14.2 },
        ],
        events: [
          {
            id: "older",
            kind: "push",
            repo: "onurerguden/older",
            at: new Date(now - 9 * DAY).toISOString(),
            commits: 1,
            branch: "main",
          },
          {
            id: "pr",
            kind: "pull_request",
            repo: "onurerguden/TaskFoo",
            at: new Date(now - 3_600_000).toISOString(),
            action: "merged",
            number: 7,
          },
          ...Array.from({ length: 8 }, (_, i) => ({
            id: `branch-${i}`,
            kind: "create",
            ref: "branch",
            name: `feature-${i}`,
            repo: "onurerguden/hidden",
            at: new Date(now - i * 1000).toISOString(),
          })),
          {
            id: "newest",
            kind: "push",
            repo: longRepo,
            at: new Date(newestVisible).toISOString(),
            commits: null,
            branch: "main",
          },
          {
            id: "release",
            kind: "release",
            repo: "onurerguden/released",
            at: new Date(now - 120_000).toISOString(),
            tag: "v2.0",
          },
        ],
      },
    ]);
    await page.goto(`/${locale}`);
    const section = page.locator("#activity");
    const events = section.locator("ol");
    // The live panels replace the first render once the routed data arrives.
    await expect(section.locator("dd")).toHaveCount(3);
    await events.scrollIntoViewIfNeeded();
    await expect(events.locator("li")).toHaveCount(3);
    expect(
      await events
        .locator("a")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
    ).toEqual([
      `https://github.com/${longRepo}`,
      "https://github.com/onurerguden/released",
      "https://github.com/onurerguden/TaskFoo",
    ]);
    await expect(events.getByText("hidden", { exact: true })).toHaveCount(0);
    await expect(
      events.getByRole("link", {
        name:
          locale === "en"
            ? /Released v2.0 of released/
            : /released için v2.0 yayımladım/,
      }),
    ).toHaveCount(1);
    const languages = section.locator("ul");
    await expect(languages.locator("li")).toHaveCount(3);
    expect(await languages.locator("li").allTextContents()).toEqual([
      expect.stringContaining("TypeScript"),
      expect.stringContaining("Python"),
      expect.stringContaining("Java"),
    ]);
    const percent = new Intl.NumberFormat(locale === "en" ? "en-GB" : "tr-TR", {
      style: "percent",
      maximumFractionDigits: 1,
    });
    for (const share of [43.2, 31.1, 14.2])
      await expect(
        languages.getByText(percent.format(share / 100), { exact: true }),
      ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("portfolio:activity-seen")),
      )
      .toBe(String(newestVisible));
    await expect(
      section.getByRole("link", {
        name:
          locale === "en" ? /See my profile on GitHub/ : /GitHub profilime bak/,
      }),
    ).toHaveCount(1);
    const bounds = await section.locator("h3").evaluateAll((heads) =>
      heads.map((head) => {
        const rect = head.parentElement!.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    );
    if (page.viewportSize()!.width > 760) {
      expect(Math.abs(bounds[0].width - bounds[1].width)).toBeLessThan(1);
      expect(Math.abs(bounds[0].height - bounds[1].height)).toBeLessThan(1);
      expect(bounds[0].y).toBe(bounds[1].y);
    } else {
      expect(bounds[1].y).toBeGreaterThan(bounds[0].y);
      expect(bounds[0].x).toBe(bounds[1].x);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      await events
        .locator("a")
        .evaluateAll((links) =>
          links.every((link) => link.scrollWidth <= link.clientWidth + 1),
        ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .include("#activity")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}

test("calendar cells fill the desktop panel and remain square at responsive widths", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop Chromium covers the responsive width sweep.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await serve(page, [fixture()]);
  await page.goto("/en");
  const grid = page.locator("#activity").getByRole("grid");
  await expect(grid).toBeAttached();
  for (const width of [320, 390, 760, 900, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await grid.scrollIntoViewIfNeeded();
    const dimensions = await grid.evaluate((table) => {
      const cells = Array.from(table.querySelectorAll('[role="gridcell"]')).map(
        (cell) => cell.getBoundingClientRect(),
      );
      const weekCount = table
        .querySelector("tbody tr")!
        .querySelectorAll("td").length;
      const weekdayWidth = table
        .querySelector("tbody th")!
        .getBoundingClientRect().width;
      const gap = Number.parseFloat(getComputedStyle(table).borderSpacing);
      return {
        cells: cells.map((cell) => ({
          width: cell.width,
          height: cell.height,
        })),
        tableWidth: table.getBoundingClientRect().width,
        scrollerWidth: table.parentElement!.clientWidth,
        scrollWidth: table.parentElement!.scrollWidth,
        minimumWidth: weekdayWidth + weekCount * 12 + (weekCount + 2) * gap,
      };
    });
    expect(
      Math.max(...dimensions.cells.map((cell) => cell.width)) -
        Math.min(...dimensions.cells.map((cell) => cell.width)),
    ).toBeLessThan(0.5);
    for (const cell of dimensions.cells) {
      expect(cell.width).toBeGreaterThanOrEqual(12);
      expect(Math.abs(cell.width - cell.height)).toBeLessThan(0.5);
    }
    if (dimensions.scrollerWidth >= dimensions.minimumWidth) {
      expect(
        Math.abs(dimensions.tableWidth - dimensions.scrollerWidth),
      ).toBeLessThan(2);
    } else {
      expect(
        Math.abs(dimensions.tableWidth - dimensions.minimumWidth),
      ).toBeLessThan(2);
      expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.scrollerWidth);
      for (const cell of dimensions.cells)
        expect(Math.abs(cell.width - 12)).toBeLessThan(0.5);
    }
    expect(
      await page
        .locator("#activity dt, #activity dd")
        .evaluateAll((values) =>
          values.every((value) => value.scrollWidth <= value.clientWidth + 1),
        ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
});

test("empty feeds and language lists say so", async ({ page }) => {
  await serve(page, [{ ...fixture(), events: [], languages: [] }]);
  await page.goto("/en");
  const section = page.locator("#activity");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("No language data yet.")).toBeVisible();
  await expect(
    section.getByText("No public pushes, pull requests or releases lately."),
  ).toBeVisible();
  await expect(section.locator("ol")).toHaveCount(0);
});

test("heatmap focus stays on its day when the window moves", async ({
  page,
}) => {
  await page.clock.install();
  await serve(page, [
    fixture(),
    // A week later the rolling window has dropped its first week.
    fixture({ syncedAt: Date.now(), rollingStart: "2025-10-06" }),
  ]);
  await page.goto("/en");
  const grid = page.locator("#activity").getByRole("grid");
  await grid.scrollIntoViewIfNeeded();
  const tabbable = grid.locator('[role="gridcell"][tabindex="0"]');
  await tabbable.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowLeft");
  const day = await tabbable.getAttribute("aria-label");
  await page.clock.runFor(POLL + 1000);
  // The new window ends a week later.
  await expect(grid.locator('[aria-label$="on 6 Oct 2026"]')).toHaveCount(1);
  await expect(tabbable).toHaveCount(1);
  await expect(tabbable).toHaveAttribute("aria-label", day!);
});

test("announces new contributions made while the page is open", async ({
  page,
}) => {
  await page.clock.install();
  await serve(page, [fixture(), fixture({ extra: 3, syncedAt: Date.now() })]);
  await page.goto("/tr");
  const section = page.locator("#activity");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("katkı", { exact: true })).toBeVisible();
  await page.clock.runFor(3 * 60_000 + 1000);
  await expect(section.getByRole("status")).toHaveText(
    "Geldiğinden beri 3 yeni katkı",
  );
});

test("work from before the visit is not announced as new", async ({ page }) => {
  await page.clock.install();
  const now = Date.now();
  await serve(page, [
    // Synced long before the visit, then refreshed after it.
    fixture({ syncedAt: now - 30 * 60_000 }),
    fixture({ extra: 12, syncedAt: now }),
    fixture({ extra: 14, syncedAt: now + 1000 }),
  ]);
  await page.goto("/en");
  const section = page.locator("#activity");
  await section.scrollIntoViewIfNeeded();
  const total = section.locator("dd").first();
  await expect(total).not.toBeEmpty();
  const stale = await total.textContent();
  const status = section.getByRole("status");
  await page.clock.runFor(POLL + 1000);
  // The refreshed snapshot is shown but becomes the starting point.
  await expect(total).not.toHaveText(stale!);
  await expect(status).toHaveText("");
  await page.clock.runFor(POLL + 1000);
  await expect(status).toHaveText("2 new contributions since you arrived");
});

test("new badges last for the visit and clear once seen", async ({
  page,
  context,
}) => {
  const body = fixture();
  await serve(page, [body]);
  // The desk renders in software WebGL above the section, so hydration and
  // the first poll can take several seconds on a busy machine.
  const slow = { timeout: ci(15_000) };
  // No hash: a deep link would hold the page on the section's top.
  await page.goto("/en");
  const events = page.locator("#activity ol");
  await expect(events.getByText("New", { exact: true })).toHaveCount(1, slow);
  await events.scrollIntoViewIfNeeded();
  await expect
    .poll(
      () =>
        page.evaluate(() => localStorage.getItem("portfolio:activity-seen")),
      slow,
    )
    .not.toBeNull();
  // Switching language keeps this visit's badges.
  await page.goto("/tr");
  await expect(
    page.locator("#activity ol").getByText("Yeni", { exact: true }),
  ).toHaveCount(1, slow);
  // A later visit (a new tab) has already seen that push.
  const later = await context.newPage();
  await serve(later, [body]);
  await later.goto("/en");
  await expect(later.locator("#activity ol li")).toHaveCount(2, slow);
  // Badges are decided a frame after the visit's baseline is read; only
  // then does "no badge" mean anything.
  await expect
    .poll(() =>
      later.evaluate(() =>
        sessionStorage.getItem("portfolio:activity-seen-before"),
      ),
    )
    .not.toBeNull();
  await later.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      ),
  );
  await expect(
    later.locator("#activity ol").getByText("New", { exact: true }),
  ).toHaveCount(0);
});

test("an older cached response never replaces newer numbers", async ({
  page,
}) => {
  await page.clock.install();
  await serve(page, [
    fixture(),
    fixture({ extra: 50, syncedAt: Date.now() - 30 * 60_000 }),
  ]);
  await page.goto("/en");
  const section = page.locator("#activity");
  await section.scrollIntoViewIfNeeded();
  const total = section.locator("dd").first();
  await expect(total).not.toBeEmpty();
  const before = await total.textContent();
  const second = page.waitForEvent("requestfinished", (request) =>
    request.url().endsWith("/api/github/activity"),
  );
  await page.clock.runFor(3 * 60_000 + 1000);
  await second;
  await expect(total).toHaveText(before!);
  await expect(section.getByRole("status")).toHaveText("");
});

test("switching tabs mid-poll keeps a single polling chain", async ({
  page,
}) => {
  await page.clock.install();
  let calls = 0;
  let release = () => {};
  const held = new Promise<void>((done) => (release = done));
  // The same snapshot every time (WebKit can't fulfil a routed 304), so
  // each poll waits the normal three minutes.
  const body = JSON.stringify(fixture());
  await page.route("**/api/github/activity", async (route) => {
    calls++;
    // The second poll stays in flight while the visitor leaves and returns.
    if (calls === 2) await held;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { etag: '"activity-1"' },
      body,
    });
  });
  const finished = () =>
    page.waitForEvent("requestfinished", (request) =>
      request.url().endsWith("/api/github/activity"),
    );
  // Real time for the page to handle a response and set its next timer.
  const settle = () => page.waitForTimeout(300);

  let next = finished();
  await page.goto("/en");
  await next;
  await settle();
  await page.clock.runFor(POLL + 1000);
  await expect.poll(() => calls).toBe(2);

  await page.evaluate(() => {
    for (const state of ["hidden", "visible"]) {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => state,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    }
  });
  await page.clock.runFor(1000);
  await settle();
  // Coming back while a poll is in flight must not start another one.
  expect(calls).toBe(2);

  next = finished();
  release();
  await next;
  await settle();
  await page.clock.runFor(POLL + 1000);
  await expect.poll(() => calls).toBe(3);
  await settle();
  await page.clock.runFor(POLL + 1000);
  await settle();
  expect(calls).toBe(4);
});
