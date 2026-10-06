import { test, expect } from "@playwright/test";
import { ci, go, story } from "./helpers";

test("pages send a nonce CSP and the security headers", async ({ request }) => {
  const response = await request.get("/en");
  const headers = response.headers();
  const csp = headers["content-security-policy"];
  expect(csp).toMatch(/script-src 'self' 'nonce-[\w+/=]+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-powered-by"]).toBeUndefined();
  // A fresh nonce on every request.
  const again = (await request.get("/en")).headers()["content-security-policy"];
  expect(again).not.toBe(csp);
});

test("prefetches and dotted page paths get the policy too", async ({
  request,
}) => {
  const requests: [string, Record<string, string>][] = [
    ["/tr/projects/kuyumcum", { purpose: "prefetch" }],
    ["/tr/projects/kuyumcum", { "next-router-prefetch": "1", rsc: "1" }],
    ["/en/projects/v1.2", {}],
  ];
  for (const [path, headers] of requests) {
    const response = await request.get(path, { headers });
    expect(response.headers()["content-security-policy"], path).toMatch(
      /'nonce-[\w+/=]+'/,
    );
  }
});

test("versioned desk files are cached for good, others revalidate", async ({
  request,
  page,
}) => {
  await page.goto("/en");
  const model = await page.evaluate(
    () =>
      [...document.querySelectorAll('link[rel="preload"]')]
        .map((link) => link.getAttribute("href"))
        .find((href) => href?.includes("/models/desk/")) ?? null,
  );
  if (model) {
    const response = await request.get(model);
    expect(response.headers()["cache-control"]).toContain("immutable");
  }
  const plain = await request.get("/icon.svg");
  expect(plain.headers()["cache-control"]).not.toContain("immutable");
});

test("lab pages are never indexed", async ({ request }) => {
  const variants: Record<string, string>[] = [{}, { purpose: "prefetch" }];
  for (const headers of variants) {
    const response = await request.get("/en/lab/desk/journey", { headers });
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
  }
});

test("a full scroll through the desk raises no CSP violation", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, "One desktop pass per engine is enough.");
  test.setTimeout(ci(120000));
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text()))
      violations.push(message.text());
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) =>
      console.error(
        `Refused to load ${event.blockedURI} (${event.violatedDirective})`,
      ),
    );
  });
  await page.goto("/en");
  if (browserName === "chromium") {
    await expect(page.locator("[data-ready]")).toHaveAttribute(
      "data-ready",
      "true",
      { timeout: ci(20000) },
    );
    const s = await story(page);
    for (const d of [s.chapters.services, s.chapters.stack, s.room, s.length])
      await go(page, d);
  }
  await page.evaluate(() =>
    scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
  );
  await page.waitForTimeout(1500);
  expect(violations).toEqual([]);
});
