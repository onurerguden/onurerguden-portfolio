import { afterEach, describe, expect, it, vi } from "vitest";
import { getProject, getProjects, sharedFacts } from "../src/lib/content";
import { llmsFull, llmsIndex } from "../src/lib/llms";

afterEach(() => vi.unstubAllEnvs());

describe("llms.txt", () => {
  it("links every case study and the full text", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    const index = llmsIndex();
    expect(index.startsWith(`# ${sharedFacts.name}\n\n> `)).toBe(true);
    for (const project of getProjects("en").filter((p) => p.featured))
      expect(index).toContain(
        `(https://onurerguden.dev/en/projects/${project.slug})`,
      );
    expect(index).toContain("(https://onurerguden.dev/llms-full.txt)");
  });

  it("carries the case studies without their components", () => {
    const full = llmsFull();
    const kuyumcum = getProject("en", "kuyumcum");
    expect(full).toContain(`## Case study: ${kuyumcum?.title}`);
    expect(full).not.toMatch(/<[A-Z]\w*\s*\/>/);
    expect(full).not.toContain("[[metric:");
  });
});
