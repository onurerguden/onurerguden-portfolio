import fs from "node:fs";
import { describe, expect, it } from "vitest";
import pkg from "../package.json";

describe("CI browser image", () => {
  it("matches the installed Playwright version", () => {
    const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");
    const image = workflow.match(
      /mcr\.microsoft\.com\/playwright:v([\d.]+)-noble/,
    );
    // A different tag would run the tests against browsers Playwright
    // does not expect, and it would download its own again.
    expect(image?.[1]).toBe(pkg.devDependencies["@playwright/test"]);
    expect(workflow).not.toContain("--with-deps");
  });
});
