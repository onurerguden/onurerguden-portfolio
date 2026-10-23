import { test, expect } from "@playwright/test";
import { sharedFacts } from "../../src/lib/content";
import { getIdentity } from "../../src/lib/identity";
import { getServices } from "../../src/lib/home-content";
import { siteOrigin } from "../../src/lib/site";
import {
  auditPage,
  crawlerAgents,
  editorialSignature,
} from "../../scripts/seo/audit-page.mjs";

// The existing CI build remains a noindex preview. To check an indexable
// production build explicitly, set SEO_EXPECT_INDEXABLE=true and supply its
// build-time canonical origin via SEO_CANONICAL_ORIGIN when necessary.
const indexable = process.env.SEO_EXPECT_INDEXABLE === "true";
const canonicalOrigin = process.env.SEO_CANONICAL_ORIGIN || siteOrigin();
const representatives = ["/en", "/tr", "/tr/about", "/en/projects/kuyumcum"];

for (const locale of ["en", "tr"] as const) {
  test(`${locale}: production homepage content is usable without JavaScript`, async ({
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
        new URL(`/${locale}`, testInfo.project.use.baseURL).href,
      );
      expect(response?.status()).toBe(200);
      const identity = getIdentity(locale);
      await expect(noJs.locator("html")).toHaveAttribute("lang", locale);
      await expect(noJs.locator("main h1")).toHaveCount(1);
      await expect(noJs.locator("main h1")).toHaveText(identity.heading);
      await expect(noJs.locator("main h1")).not.toHaveAttribute(
        "aria-label",
        /./,
      );
      await expect(noJs.locator("main")).toContainText("İzmir");
      for (const id of [
        "services",
        "experience",
        "stack",
        "about",
        "work",
        "research",
        "contact",
      ])
        await expect(noJs.locator(`#${id}`)).toBeVisible();
      await expect(
        noJs.locator(`#work a[href="/${locale}/projects/kuyumcum"]`).first(),
      ).toBeVisible();
      await expect(
        noJs.locator(`#research a[href="/${locale}/research"]`).first(),
      ).toBeVisible();
      await expect(
        noJs.locator(`#contact a[href="mailto:${sharedFacts.email}"]`).first(),
      ).toBeVisible();
      await expect(noJs.locator("canvas")).toHaveCount(0);
      const body = await response!.text();
      expect(
        auditPage(body, `${canonicalOrigin}/${locale}`, response!.headers(), {
          indexable,
        }).failures,
      ).toEqual([]);
      const data = JSON.parse(
        await noJs.locator('script[type="application/ld+json"]').innerText(),
      ) as { "@graph": Record<string, unknown>[] };
      expect(
        data["@graph"].find((node) => node["@type"] === "Person"),
      ).toMatchObject({
        name: sharedFacts.name,
        homeLocation: {
          "@type": "Place",
          address: { addressLocality: "İzmir", addressCountry: "TR" },
        },
      });
      // Native keyboard activation must work without application scripts.
      const proof = getServices(locale).find(
        (service) => service.id === "agents",
      )!.supportingProof!;
      const source = noJs.getByRole("link", { name: proof.label, exact: true });
      await source.focus();
      await expect(source).toBeFocused();
      await source.press("Enter");
      await expect(noJs).toHaveURL(
        new URL(proof.href, testInfo.project.use.baseURL).href,
      );
    } finally {
      await context.close();
    }
  });
  test(`${locale}: the supporting LangGraph evidence has its own clickable target`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const proof = getServices(locale).find(
      (service) => service.id === "agents",
    )!.supportingProof!;
    const source = page.getByRole("link", { name: proof.label, exact: true });
    await source.scrollIntoViewIfNeeded();
    await source.focus();
    await expect(source).toBeFocused();
    await source.click();
    await expect(page).toHaveURL(
      new RegExp(`${proof.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    );
  });
}

test("representative crawler agents receive the same editorial HTML and HTTP indexability", async ({
  request,
}) => {
  for (const path of representatives) {
    const regular = await request.get(path);
    expect(regular.status()).toBe(200);
    const baseline = editorialSignature(await regular.text());
    for (const agent of crawlerAgents) {
      const response = await request.get(path, {
        headers: { "User-Agent": agent },
      });
      expect(response.status(), `${agent} ${path}`).toBe(200);
      const html = await response.text();
      expect(
        auditPage(html, `${canonicalOrigin}${path}`, response.headers(), {
          indexable,
        }).failures,
        `${agent} ${path}`,
      ).toEqual([]);
      expect(editorialSignature(html), `${agent} ${path}`).toEqual(baseline);
    }
  }
  // UA parity does not verify a real provider's IP, visits, index or citations.
});
