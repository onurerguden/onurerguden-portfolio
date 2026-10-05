import { test, expect, type Page } from "@playwright/test";

/** The top of a sheet's section and of the next sheet's, in view px. */
async function tops(page: Page, id: string, next: string) {
  return page.evaluate(
    ([a, b]) => {
      const top = (sheet: string) =>
        document.querySelector(`#${sheet} > section`)!.getBoundingClientRect()
          .top;
      return { section: top(a), next: top(b), view: innerHeight };
    },
    [id, next],
  );
}

test.describe("section sheets", () => {
  test.skip(({ isMobile }) => isMobile, "Phones read the sections in flow.");
  test.beforeEach(async ({ page }) => {
    // The static view: the sheets do not depend on the desk.
    await page.addInitScript(() =>
      sessionStorage.setItem("portfolio:desk-static", "true"),
    );
  });

  test("a section settles, holds for a few steps, then the next slides over it", async ({
    page,
  }) => {
    await page.goto("/en#about");
    await expect
      .poll(async () => (await tops(page, "about", "work")).section)
      .toBeCloseTo(0, 0);
    // About fits the view: a third of a view later it is still alone.
    await page.evaluate(() =>
      scrollBy({ top: innerHeight * 0.3, behavior: "instant" }),
    );
    let state = await tops(page, "about", "work");
    expect(state.section).toBeCloseTo(0, 0);
    expect(state.next).toBeGreaterThanOrEqual(state.view - 1);
    // Past the dwell, Projects slides over it.
    await page.evaluate(() =>
      scrollBy({ top: innerHeight * 0.4, behavior: "instant" }),
    );
    state = await tops(page, "about", "work");
    expect(state.section).toBeCloseTo(0, 0);
    expect(state.next).toBeLessThan(state.view);
    expect(state.next).toBeGreaterThan(0);
    // The covered sheet recedes where scroll-driven animation exists.
    const scale = await page
      .locator("#about > section")
      .evaluate((node) => getComputedStyle(node).transform);
    const supported = await page.evaluate(() =>
      CSS.supports("animation-timeline: view()"),
    );
    if (supported) expect(scale).not.toBe("none");
  });

  test("links land on each section's top and the sections after Projects read in one flow", async ({
    page,
  }) => {
    for (const id of ["research", "activity"]) {
      await page.goto(`/en#${id}`);
      await expect
        .poll(() =>
          page
            .locator(`#${id}`)
            .evaluate((node) =>
              Math.abs(Math.round(node.getBoundingClientRect().top)),
            ),
        )
        .toBe(0);
    }
    // Contact ends the page: it lands as high as the page can scroll, whole.
    await page.goto("/en#contact");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const rect = document
            .querySelector("#contact > section")!
            .getBoundingClientRect();
          const end =
            Math.abs(
              scrollY + innerHeight - document.documentElement.scrollHeight,
            ) < 2;
          return end && rect.top >= 0 && rect.bottom <= innerHeight;
        }),
      )
      .toBe(true);
    // From Research on nothing holds or overlaps: scrolling moves Research
    // by the same distance and GitHub activity follows right below it.
    await page.goto("/en#research");
    await expect
      .poll(async () => (await tops(page, "research", "activity")).section)
      .toBeCloseTo(0, 0);
    await page.evaluate(() =>
      scrollBy({ top: innerHeight * 0.5, behavior: "instant" }),
    );
    const flow = await page.evaluate(() => {
      const research = document
        .querySelector("#research > section")!
        .getBoundingClientRect();
      const activity = document
        .querySelector("#activity > section")!
        .getBoundingClientRect();
      return {
        top: research.top,
        gap: activity.top - research.bottom,
        view: innerHeight,
      };
    });
    expect(flow.top).toBeCloseTo(-flow.view * 0.5, 0);
    expect(Math.abs(flow.gap)).toBeLessThan(2);
    for (const id of ["research", "activity", "contact"])
      await expect(page.locator(`#${id} > section`)).not.toHaveCSS(
        "position",
        "sticky",
      );
  });

  test("keyboard focus is never left under Projects", async ({ page }) => {
    await page.goto("/en#work");
    await expect
      .poll(async () => (await tops(page, "work", "research")).section)
      .toBeCloseTo(0, 0);
    // Projects now covers About; focus a link in About.
    const link = page.locator("#about a").first();
    await link.focus();
    const covered = await link.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const top = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return !node.contains(top) && !top?.contains(node);
    });
    expect(covered).toBe(false);
  });

  test("reduced motion reads the sections in flow", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    await expect(page.locator("#about > section")).toHaveCSS(
      "position",
      "relative",
    );
    await expect(page.locator("#work > section")).toHaveCSS(
      "position",
      "static",
    );
  });
});
