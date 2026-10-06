import { describe, expect, it } from "vitest";
// The documented name, unstable_doesProxyMatch, is not exported by this Next release.
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "../src/proxy";

const runs = (url: string, headers?: Record<string, string>) =>
  unstable_doesMiddlewareMatch({ config, url, headers });

describe("proxy coverage", () => {
  it("runs for every page, prefetches included", () => {
    for (const url of ["/", "/en", "/tr/projects/kuyumcum", "/en/lab/desk"]) {
      expect(runs(url)).toBe(true);
      expect(runs(url, { "next-router-prefetch": "1" })).toBe(true);
      expect(runs(url, { purpose: "prefetch" })).toBe(true);
    }
  });
  it("runs for page paths that contain a dot", () => {
    expect(runs("/en/projects/v1.2")).toBe(true);
    expect(runs("/en/lab/desk.review")).toBe(true);
  });
  it("skips the API, build output and public files", () => {
    for (const url of [
      "/api/github/activity",
      "/_next/static/chunks/main.js",
      "/_next/image?url=%2Fa.png&w=64&q=75",
      "/favicon.ico",
      "/robots.txt",
      "/sitemap.xml",
      "/fonts/portfolio-display-latin.woff2",
      "/desk/desk.glb",
    ])
      expect(runs(url)).toBe(false);
  });
});
