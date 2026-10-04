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

  test("links land on each section's top and nothing shows behind the last", async ({
    page,
  }) => {
    for (const id of ["research", "activity", "contact"]) {
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
    await page.evaluate(() =>
      scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    // At the end Contact fills everything above the footer.
    const end = await page.evaluate(() => {
      const contact = document
        .querySelector("#contact > section")!
        .getBoundingClientRect();
      const footer = document.querySelector("footer")!.getBoundingClientRect();
      return { top: contact.top, gap: footer.top - contact.bottom };
    });
    expect(end.top).toBeLessThanOrEqual(0);
    expect(Math.abs(end.gap)).toBeLessThan(2);
  });

  test("keyboard focus is never left under a later sheet", async ({ page }) => {
    await page.goto("/en#research");
    await page.evaluate(() =>
      scrollBy({ top: innerHeight * 1.2, behavior: "instant" }),
    );
    // Focus a link in Projects, which Research now covers.
    await page.locator("#work a").first().focus();
    const covered = await page
      .locator("#work a")
      .first()
      .evaluate((node) => {
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
