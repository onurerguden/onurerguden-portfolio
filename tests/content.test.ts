import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  caseHeadings,
  caseSections,
  slugify,
  getProject,
  getProjects,
  isLocale,
  sharedFacts,
  validateContent,
} from "../src/lib/content";
import {
  formatPeriod,
  getCertificates,
  getExperience,
  getServices,
  getTechStack,
  validateHomeContent,
} from "../src/lib/home-content";

const temporary: string[] = [];
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-content-"));
  temporary.push(root);
  fs.cpSync(path.join(process.cwd(), "src/content"), root, { recursive: true });
  return root;
}
afterEach(() =>
  temporary
    .splice(0)
    .forEach((root) => fs.rmSync(root, { recursive: true, force: true })),
);

describe("bilingual portfolio content", () => {
  it("provides four complete case studies and five archive entries in each language", () => {
    expect(() => validateContent()).not.toThrow();
    for (const locale of ["en", "tr"] as const) {
      const projects = getProjects(locale);
      expect(projects).toHaveLength(9);
      expect(projects.filter((project) => project.body)).toHaveLength(4);
      expect(
        projects
          .filter((project) => !project.featured)
          .every((project) => !project.body),
      ).toBe(true);
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
  it("resolves shared measurements in both locales and rejects unknown facts", () => {
    expect(getProject("en", "water-safety")?.body).toContain("26,469");
    expect(getProject("tr", "water-safety")?.body).toContain("26.469");
    expect(getProject("tr", "water-safety")?.metric?.value).toBe("26.469");
    const root = fixture();
    const file = path.join(root, "tr/water-safety.mdx");
    fs.appendFileSync(file, "\n[[metric:inventedScore]]");
    expect(() => validateContent(root)).toThrow("Unknown measurement");
  });
  it("shows no model score that the revision audit withdrew", () => {
    for (const locale of ["en", "tr"] as const)
      for (const project of getProjects(locale)) {
        const text = [project.summary, project.body, project.metric?.value]
          .filter(Boolean)
          .join(" ");
        expect(text).not.toMatch(
          /(%\s?(96[.,]3|5[.,]77|80)\b)|\b(96[.,]3|5[.,]77|80)\s?%/,
        );
        expect(text).not.toMatch(/30[.,]000|3[.,]000\b|27[.,]000/);
      }
    expect(getProject("en", "taskfoo")?.stack).not.toContain("Docker");
  });
  it("handles unsupported routes explicitly", () => {
    expect(isLocale("fr")).toBe(false);
    expect(getProject("en", "unknown")).toBeUndefined();
  });
});

// Fixture edits deliberately break the schema, so the value is untyped JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
function editJson(root: string, file: string, edit: (value: Json) => void) {
  const target = path.join(root, file);
  const value = JSON.parse(fs.readFileSync(target, "utf8"));
  edit(value);
  fs.writeFileSync(target, JSON.stringify(value));
}

describe("home section content", () => {
  it("loads every section in both languages with the same structure", () => {
    expect(() => validateHomeContent()).not.toThrow();
    const en = getTechStack("en");
    const tr = getTechStack("tr");
    expect(en.map((c) => c.items.map((i) => i.id))).toEqual(
      tr.map((c) => c.items.map((i) => i.id)),
    );
    expect(getServices("en").map((s) => s.href)).toEqual([
      "/en/projects/course-intelligence",
      "/en/projects/gymrap-ai-coach",
      "/en/projects/water-safety",
      "/en/projects#taskfoo",
      "/en/projects/kuyumcum",
    ]);
  });
  it("fails when a translated service is missing", () => {
    const root = fixture();
    editJson(root, "tr/services.json", (value) => delete value.mobile);
    expect(() => validateHomeContent(root)).toThrow("parity");
  });
  it("rejects a service whose proof does not exist", () => {
    const root = fixture();
    editJson(root, "services.json", (value) => {
      value[0].proof.slug = "invented-project";
    });
    expect(() => validateHomeContent(root)).toThrow("Unknown service proof");
  });
  it("rejects a technology without a generated icon", () => {
    const root = fixture();
    editJson(root, "tech-stack.json", (value) => {
      value.items[0].icon = { simpleIcons: "not-an-icon" };
    });
    expect(() => validateHomeContent(root)).toThrow("Missing generated icon");
  });
  it("lists certificates newest first with the issuer's name in each language", () => {
    for (const locale of ["en", "tr"] as const) {
      const issued = getCertificates(locale).map((item) => item.issued);
      expect(issued).toEqual(issued.toSorted().reverse());
    }
    const issuer = (locale: "en" | "tr") =>
      getCertificates(locale).find(
        (item) => item.id === "academy-deep-learning",
      )?.issuer;
    expect(issuer("en")).toBe("Google AI & Technology Academy");
    expect(issuer("tr")).toBe("Yapay Zeka ve Teknoloji Akademisi");
  });
  it("only accepts certificates whose images were reviewed for personal data", () => {
    const root = fixture();
    editJson(root, "certificates.json", (value) =>
      value.push({
        id: "sample",
        issuer: "Issuer",
        issued: "2026-05",
        image: {
          src: "/images/certificates/sample.webp",
          width: 10,
          height: 10,
        },
        order: 1,
      }),
    );
    for (const locale of ["en", "tr"])
      editJson(root, `${locale}/certificates.json`, (value) => {
        value.sample = { title: "Sample", alt: "Sample certificate" };
      });
    expect(() => validateHomeContent(root)).toThrow("personalDataReviewed");
  });
  it("requires alt text for every project image", () => {
    const root = fixture();
    editJson(root, "tr/projects.json", (value) => {
      value.kuyumcum.mediaAlt.pop();
    });
    expect(() => validateContent(root)).toThrow("Media alt text mismatch");
  });
  it("formats experience periods for each language", () => {
    expect(formatPeriod("2026-07", null, "en")).toBe("Jul 2026 — present");
    expect(formatPeriod("2026-04", "2026-06", "tr")).toBe("Nis — Haz 2026");
    expect(getExperience("en")[0]).toMatchObject({
      company: "Future Is Now",
      role: "AI engineer",
    });
  });
  it("links each role to its proof and tools in both languages", () => {
    for (const locale of ["en", "tr"] as const) {
      const roles = getExperience(locale);
      expect(roles).toHaveLength(4);
      const vbt = roles.find((role) => role.id === "vbt-intern");
      expect(vbt?.proof).toMatchObject({
        kind: "project",
        href: `/${locale}/projects#taskfoo`,
      });
      expect(vbt?.tools).toContain("Spring Boot");
      expect(roles.filter((role) => role.proof)).toHaveLength(1);
    }
  });
  it("keeps the same number of contributions per role in both languages", () => {
    const root = fixture();
    editJson(root, "tr/experience.json", (value) => {
      value["bmc-intern"].highlights.pop();
    });
    expect(() => validateHomeContent(root)).toThrow("highlight parity");
  });
  it("needs a link label for every role with proof, and only those", () => {
    const root = fixture();
    editJson(root, "en/experience.json", (value) => {
      delete value["vbt-intern"].proofLabel;
    });
    expect(() => validateHomeContent(root)).toThrow("proof and its label");
  });
  it("rejects a role tool that is not in the technology list", () => {
    const root = fixture();
    editJson(root, "experience.json", (value) => {
      value[0].tools.push("invented-tool");
    });
    expect(() => validateHomeContent(root)).toThrow("Unknown experience tool");
  });
});

describe("technology evidence", () => {
  it("links technologies to projects, roles or this site", () => {
    const items = getTechStack("en").flatMap((category) => category.items);
    expect(items).toHaveLength(48);
    const evidence = (id: string) =>
      items.find((item) => item.id === id)?.evidence ?? [];
    expect(evidence("python").map((proof) => proof.href)).toEqual([
      "/en/projects/water-safety",
      "/en/projects/course-intelligence",
      "/en/projects#urban-mobility",
    ]);
    expect(evidence("langgraph")).toEqual([
      expect.objectContaining({ kind: "experience", label: "Future Is Now" }),
      expect.objectContaining({ href: "/en/projects#carbonpilot" }),
    ]);
    expect(evidence("mcp").map((proof) => proof.href)).toEqual([
      "/en/projects/gymrap-ai-coach",
    ]);
    // Docker is shown only where it was used: the VBT internship, CarbonPilot
    // and the Future Is Now role.
    expect(evidence("docker").map((proof) => proof.label)).toEqual([
      expect.stringContaining("VBT"),
      "CarbonPilot AI",
      "Future Is Now",
    ]);
    // Private repositories are never named: their tools point to the role.
    expect(evidence("minio").map((proof) => proof.href)).toEqual([
      "#experience",
    ]);
    expect(evidence("threejs")).toEqual([
      expect.objectContaining({ kind: "site", external: true }),
    ]);
    // No evidence is invented for tools without a public example.
    expect(evidence("figma")).toEqual([]);
  });
  it("rejects evidence that points nowhere", () => {
    for (const proof of [
      { kind: "project", slug: "invented" },
      { kind: "experience", id: "invented" },
      { kind: "section", id: "about" },
    ]) {
      const root = fixture();
      editJson(root, "tech-stack.json", (value) => {
        value.items[0].evidence = [proof];
      });
      expect(() => validateHomeContent(root)).toThrow(/technology evidence/i);
    }
  });
});

describe("case studies", () => {
  it("state my role on case studies only", () => {
    for (const locale of ["en", "tr"] as const)
      for (const project of getProjects(locale))
        expect(Boolean(project.role)).toBe(project.featured);
    const root = fixture();
    editJson(root, "en/projects.json", (value) => {
      value.pam.role = "Invented role";
    });
    expect(() => validateContent(root)).toThrow("Role belongs");
  });
  it("keep the same sections in both languages", () => {
    for (const slug of ["kuyumcum", "water-safety", "course-intelligence"]) {
      const en = caseHeadings(getProject("en", slug)?.body ?? "");
      const tr = caseHeadings(getProject("tr", slug)?.body ?? "");
      expect(en.length).toBeGreaterThan(2);
      expect(tr).toHaveLength(en.length);
    }
    const root = fixture();
    fs.appendFileSync(path.join(root, "tr/kuyumcum.mdx"), "\n## Ek bölüm\n");
    expect(() => validateContent(root)).toThrow("sections differ");
  });
  it("make no accuracy claim for the RAG evaluation", () => {
    for (const locale of ["en", "tr"] as const) {
      const body = getProject(locale, "course-intelligence")?.body ?? "";
      expect(body).not.toMatch(/100|%/);
    }
  });
});

describe("case study sections", () => {
  it("share English ids in both languages", () => {
    expect(slugify("What I can demonstrate")).toBe("what-i-can-demonstrate");
    for (const slug of ["kuyumcum", "water-safety", "course-intelligence"]) {
      const en = caseSections("en", slug);
      const tr = caseSections("tr", slug);
      expect(tr.map((s) => s.id)).toEqual(en.map((s) => s.id));
      expect(tr.map((s) => s.label)).not.toEqual(en.map((s) => s.label));
      expect(new Set(en.map((s) => s.id)).size).toBe(en.length);
    }
    expect(caseSections("en", "pam")).toEqual([]);
  });
});
