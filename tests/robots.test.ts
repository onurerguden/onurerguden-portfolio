import { afterEach, describe, expect, it, vi } from "vitest";
import {
  blockedRobotsTokens,
  robotsTokens,
} from "../scripts/seo/audit-page.mjs";
import robots from "../src/app/robots";
import { robotsMetadata } from "../src/lib/site";

afterEach(() => vi.unstubAllEnvs());

function production() {
  vi.stubEnv("SITE_INDEXABLE", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://portfolio.example");
}

describe("robots", () => {
  it("gives every crawler one group that keeps only the API and labs out", () => {
    production();
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/en/lab/", "/tr/lab/"],
      },
      sitemap: "https://portfolio.example/sitemap.xml",
    });
  });

  it("keeps previews and local builds out of search", () => {
    vi.stubEnv("SITE_INDEXABLE", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(robotsMetadata()).toEqual({ index: false, follow: false });
    vi.stubEnv("SITE_INDEXABLE", "false");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(robotsMetadata()).toEqual({ index: false, follow: false });
  });

  it("lets indexed pages be quoted in full with large previews", () => {
    production();
    expect(robotsMetadata()).toEqual({
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    });
  });
});

describe("robots.txt audit", () => {
  const site = `User-Agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://portfolio.example/sitemap.xml`;

  it("accepts the site's own rules for every search and AI token", () => {
    expect(blockedRobotsTokens(site)).toEqual([]);
  });

  it("finds a named group that shuts a bot out", () => {
    expect(
      blockedRobotsTokens(
        `${site}\n\nUser-agent: Google-Extended\nDisallow: /`,
      ),
    ).toEqual(["Google-Extended"]);
  });

  it("applies the * group to bots without their own group", () => {
    expect(blockedRobotsTokens("User-agent: *\nDisallow: /")).toEqual(
      robotsTokens,
    );
  });

  it("lets a named group override a closed * group", () => {
    expect(
      blockedRobotsTokens(
        "User-agent: *\nDisallow: /\n\nUser-agent: OAI-SearchBot\nUser-agent: Googlebot\nAllow: /",
        ["OAI-SearchBot", "Googlebot", "GPTBot"],
      ),
    ).toEqual(["GPTBot"]);
  });
});
