import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, labBlocked } from "../src/lib/security";

describe("security", () => {
  it("allows scripts only with the nonce, and the decoder's wasm", () => {
    const policy = contentSecurityPolicy("abc");
    expect(policy).toContain(
      "script-src 'self' 'nonce-abc' 'strict-dynamic' 'wasm-unsafe-eval'",
    );
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("worker-src 'self' blob:");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(contentSecurityPolicy("abc", true)).toContain("'unsafe-eval'");
  });
  it("removes the lab pages wherever the site is public", () => {
    expect(labBlocked("/en/lab/desk", { VERCEL_ENV: "production" })).toBe(true);
    expect(labBlocked("/tr/lab", { SITE_INDEXABLE: "true" })).toBe(true);
    expect(labBlocked("/en/lab/desk/journey", { VERCEL_ENV: "preview" })).toBe(
      false,
    );
    expect(labBlocked("/en/labs", { VERCEL_ENV: "production" })).toBe(false);
    expect(labBlocked("/en", { VERCEL_ENV: "production" })).toBe(false);
  });
});
