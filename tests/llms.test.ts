import { afterEach, describe, expect, it, vi } from "vitest";
import { getProject, getProjects, sharedFacts } from "../src/lib/content";
import { llmsFull, llmsIndex } from "../src/lib/llms";
import { reportWorkflow } from "../src/lib/report-workflow";
import { getResearch } from "../src/lib/research";
import { getIdentity } from "../src/lib/identity";

afterEach(() => vi.unstubAllEnvs());

describe("llms.txt", () => {
  it("links every case study and the full text", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    const index = llmsIndex();
    expect(index.startsWith(`# ${sharedFacts.name}\n\n> `)).toBe(true);
    for (const project of getProjects("en").filter((p) => p.caseStudy))
      expect(index).toContain(
        `(https://onurerguden.dev/en/projects/${project.slug})`,
      );
    expect(index).toContain("(https://onurerguden.dev/llms-full.txt)");
  });

  it("names the employer in the experience, not the summary", () => {
    const summary = llmsIndex()
      .split("\n")
      .find((line) => line.startsWith("> "));
    expect(summary).toContain(
      `is an AI engineer based in ${getIdentity("en").location}.`,
    );
    expect(summary).not.toContain(sharedFacts.work.company);
  });

  it("carries the case studies without their components", () => {
    const full = llmsFull();
    const kuyumcum = getProject("en", "kuyumcum");
    expect(full).toContain(`## Case study: ${kuyumcum?.title}`);
    expect(full).not.toMatch(/<[A-Z]\w*\s*\/>/);
    expect(full).not.toContain("[[metric:");
  });

  it("carries the Kuyumcum workflow steps the page shows", () => {
    const full = llmsFull();
    const { caption, steps } = reportWorkflow.en;
    expect(full).toContain(caption);
    steps.forEach((step, i) => expect(full).toContain(`${i + 1}. ${step}`));
  });

  it("carries every research section the page shows", () => {
    const full = llmsFull();
    const research = getResearch("en");
    for (const text of [
      research.approach,
      research.study.title,
      research.study.data,
      research.study.method,
      research.study.repoUrl,
      ...research.questions,
      research.interests,
    ])
      expect(full).toContain(text);
    expect(full).toContain(sharedFacts.publication.authors.join(", "));
    expect(full).toContain(sharedFacts.publication.sourceUrl);
    expect(full).toContain("LangGraph in CarbonPilot:");
    expect(full).toContain("/en/projects/carbonpilot");
  });
});
