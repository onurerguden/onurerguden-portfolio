import fs from "node:fs";
import { describe, expect, it } from "vitest";
import pkg from "../package.json";

describe("CI browser image", () => {
  const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");

  it("follows the installed Playwright version", () => {
    // A different tag would run the tests against browsers Playwright does
    // not expect, and it would download its own again. The tag is read from
    // package.json in CI, so a Dependabot bump moves both together.
    expect(workflow).toContain(
      "image: mcr.microsoft.com/playwright:v${{ needs.quality.outputs.playwright }}-noble",
    );
    expect(workflow).toContain(
      "playwright: ${{ steps.playwright.outputs.version }}",
    );
    expect(workflow).toContain(
      `require('./package.json').devDependencies['@playwright/test']`,
    );
    expect(workflow).not.toContain("--with-deps");
  });

  it("pins @playwright/test to an exact release, which names an image tag", () => {
    expect(pkg.devDependencies["@playwright/test"]).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
