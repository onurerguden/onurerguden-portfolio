import { test, expect } from "@playwright/test";
import budget from "./budgets.json";

test("each locale has its own share card", async ({ request }) => {
  for (const locale of ["en", "tr"]) {
    const response = await request.get(`/${locale}/opengraph-image/card`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(10_000);
  }
});

test("share cards are described in the page's language", async ({ page }) => {
  for (const [path, alt] of [
    ["/tr", "Onur Ergüden, AI mühendisi"],
    ["/en/projects/kuyumcum", "Kuyumcum: a case study by Onur Ergüden"],
    ["/tr/projects/kuyumcum", "Kuyumcum: Onur Ergüden’in vaka çalışması"],
  ]) {
    await page.goto(path);
    const image = page.locator('meta[property="og:image"]');
    await expect(image).toHaveAttribute("content", /\/opengraph-image\/card/);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      alt,
    );
    await expect(
      page.locator('meta[name="twitter:image:alt"]'),
    ).toHaveAttribute("content", alt);
  }
});

test("the home page describes me as a Person with my profiles", async ({
  page,
}) => {
  await page.goto("/tr");
  const data = JSON.parse(
    (await page
      .locator('script[type="application/ld+json"]')
      .textContent()) as string,
  ) as { "@graph": { "@type": string }[] };
  const person = data["@graph"].find((node) => node["@type"] === "Person");
  expect(person).toMatchObject({
    name: "Onur Ergüden",
    jobTitle: "AI Mühendisi",
    sameAs: [
      "https://github.com/onurerguden",
      "https://www.linkedin.com/in/onurerguden/",
    ],
    knowsAbout: expect.arrayContaining(["Model Context Protocol"]),
  });
  expect(data["@graph"].map((node) => node["@type"])).toContain("ProfilePage");
});

test("the bare origin moves to English for good", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/en");
});

test("AI assistants get the site as Markdown", async ({ request }) => {
  for (const path of ["/llms.txt", "/llms-full.txt"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    expect(await response.text()).toMatch(/^# Onur Ergüden\n\n> /);
  }
});

test("the first load stays within its byte budget", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Transfer sizes are read in Chromium.");
  const sizes: Record<string, number> = {
    script: 0,
    font: 0,
    image: 0,
    stylesheet: 0,
  };
  const pending: Promise<void>[] = [];
  page.on("requestfinished", (request) => {
    const type = request.resourceType();
    if (!(type in sizes)) return;
    pending.push(
      request.sizes().then((s) => {
        sizes[type] += s.responseBodySize;
      }),
    );
  });
  // Reduced motion measures the HTML page itself, without the desk scene.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en", { waitUntil: "networkidle" });
  await Promise.all(pending);
  console.log(`first-load bytes ${JSON.stringify(sizes)}`);
  for (const [type, limit] of Object.entries(budget.firstLoad))
    expect(sizes[type], type).toBeLessThanOrEqual(limit);
});
