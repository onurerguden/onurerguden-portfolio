import { describe, expect, it } from "vitest";
import {
  contentSecurityPolicy,
  labBlocked,
  securityTxt,
} from "../src/lib/security";

describe("security", () => {
  it("allows scripts only with the nonce, and the decoder's wasm", () => {
    const policy = contentSecurityPolicy("abc");
    expect(policy).toContain(
      "script-src 'self' 'nonce-abc' 'strict-dynamic' 'wasm-unsafe-eval'",
    );
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("worker-src 'self' blob:");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(contentSecurityPolicy("abc", { development: true })).toContain(
      "'unsafe-eval'",
    );
  });
  it("upgrades requests only on a page served over HTTPS", () => {
    expect(contentSecurityPolicy("abc")).toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy("abc", { secure: false })).not.toContain(
      "upgrade-insecure-requests",
    );
    expect(contentSecurityPolicy("abc", { development: true })).not.toContain(
      "upgrade-insecure-requests",
    );
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
  it("publishes a security contact that expires a year ahead", () => {
    const txt = securityTxt(
      "me@example.com",
      "https://onurerguden.dev",
      new Date("2026-10-06T00:00:00Z"),
    );
    expect(txt).toContain("Contact: mailto:me@example.com\n");
    expect(txt).toContain("Expires: 2027-10-06T00:00:00.000Z\n");
    expect(txt).toContain(
      "Canonical: https://onurerguden.dev/.well-known/security.txt\n",
    );
  });
});
