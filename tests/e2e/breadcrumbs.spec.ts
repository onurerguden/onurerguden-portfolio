import { test, expect } from "@playwright/test";

// The visible trail and the graph's BreadcrumbList say the same thing.
for (const path of [
  "/en/writing",
  "/tr/projects",
  "/en/research",
  "/tr/projects/kuyumcum",
]) {
  test(`${path}: the visible breadcrumb matches the graph`, async ({
    page,
  }) => {
    await page.goto(path);
    const trail = page.getByRole("navigation", {
      name: path.startsWith("/en") ? "Breadcrumb" : "Sayfa yolu",
    });
    const items = trail.locator("li");
    const visible = await items.evaluateAll((nodes) =>
      nodes.map((node) => {
        const link = node.querySelector("a");
        return {
          name: node.textContent?.trim(),
          path: link
            ? new URL(link.href).pathname
            : node.querySelector("[aria-current=page]") && location.pathname,
        };
      }),
    );
    const data = JSON.parse(
      (await page
        .locator('script[type="application/ld+json"]')
        .textContent()) as string,
    ) as {
      "@graph": {
        "@type": string;
        itemListElement?: { name: string; item: string }[];
      }[];
    };
    const list = data["@graph"].find(
      (node) => node["@type"] === "BreadcrumbList",
    )!.itemListElement!;
    expect(visible).toEqual(
      list.map((entry) => ({
        name: entry.name,
        path: new URL(entry.item).pathname,
      })),
    );
    await expect(trail.locator("[aria-current=page]")).toHaveCount(1);
  });
}
