import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DAY = 86_400_000;

/** A deterministic snapshot shaped like the API's response. */
function fixture(extra = 0) {
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
  const rolling = year(2026, "2025-09-29", 366);
  return {
    version: 1,
    syncedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
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
    section.getByText("contributions in the last 12 months", { exact: true }),
  ).toBeVisible();
  await expect(
    section.getByText("774 in private repositories", { exact: false }),
  ).toBeVisible();
  await expect(section.getByText("Tuesday")).toBeVisible();
  await expect(
    section.getByRole("link", {
      name: /Pushed 3 commits to onurerguden-portfolio/,
    }),
  ).toBeVisible();
  await expect(section.getByText("New", { exact: true })).toHaveCount(1);

  const grid = section.getByRole("grid");
  const focusable = grid.locator('[role="gridcell"][tabindex="0"]');
  await expect(focusable).toHaveCount(1);
  await focusable.focus();
  const first = await focusable.getAttribute("aria-label");
  await page.keyboard.press("ArrowLeft");
  await expect(grid.locator('[role="gridcell"]:focus')).not.toHaveAttribute(
    "aria-label",
    first!,
  );
  await expect(grid.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);

  await section.getByRole("tab", { name: "2025" }).click();
  await expect(section.getByRole("tab", { name: "2025" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(section.getByText(/contributions in 2025\./)).toBeVisible();
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

test("announces new contributions made while the page is open", async ({
  page,
}) => {
  await page.clock.install();
  await serve(page, [fixture(), fixture(3)]);
  await page.goto("/tr");
  const section = page.locator("#activity");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("son 12 aydaki katkı")).toBeVisible();
  await page.clock.runFor(3 * 60_000 + 1000);
  await expect(section.getByRole("status")).toHaveText(
    "Geldiğinden beri 3 yeni katkı",
  );
});
