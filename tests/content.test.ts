import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getProject, getProjects, isLocale, sharedFacts, validateContent } from "../src/lib/content";

const temporary: string[] = [];
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-content-"));
  temporary.push(root);
  fs.cpSync(path.join(process.cwd(), "src/content"), root, { recursive: true });
  return root;
}
afterEach(() => temporary.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

describe("bilingual portfolio content", () => {
  it("provides three complete case studies and three summaries in each language", () => {
    expect(() => validateContent()).not.toThrow();
    for (const locale of ["en", "tr"] as const) {
      const projects = getProjects(locale);
      expect(projects).toHaveLength(6);
      expect(projects.filter((project) => project.body)).toHaveLength(3);
      expect(projects.filter((project) => !project.featured).every((project) => !project.body)).toBe(true);
    }
  });
  it("fails when a translated case study is absent", () => {
    const root = fixture();
    fs.unlinkSync(path.join(root, "tr/kuyumcum.mdx"));
    expect(() => validateContent(root)).toThrow();
  });
  it("fails when a localized project summary is absent", () => {
    const root = fixture();
    const file = path.join(root, "tr/projects.json");
    const entries = JSON.parse(fs.readFileSync(file, "utf8"));
    delete entries.pam;
    fs.writeFileSync(file, JSON.stringify(entries));
    expect(() => validateContent(root)).toThrow("parity");
  });
  it("rejects a metric without its evaluation context", () => {
    const root = fixture();
    const file = path.join(root, "en/projects.json");
    const entries = JSON.parse(fs.readFileSync(file, "utf8"));
    delete entries["water-safety"].metricLabel;
    fs.writeFileSync(file, JSON.stringify(entries));
    expect(() => validateContent(root)).toThrow("metric context");
  });
  it("keeps closed source private and does not invent a publication date", () => {
    expect(getProject("en", "kuyumcum")?.repoUrl).toBeUndefined();
    expect(sharedFacts.publication.status).toBe("accepted");
    expect(sharedFacts.publication).not.toHaveProperty("doi");
    expect(sharedFacts.publication).not.toHaveProperty("date");
  });
  it("handles unsupported routes explicitly", () => {
    expect(isLocale("fr")).toBe(false);
    expect(getProject("en", "unknown")).toBeUndefined();
  });
});
