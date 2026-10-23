import { describe, expect, it } from "vitest";
import {
  deskSections,
  hashId,
  homeSectionLinks,
  homeSections,
} from "../src/lib/home-sections";

describe("reading a link's hash", () => {
  it("decodes the target id, and reads a malformed one as written", () => {
    expect(hashId("#experience")).toBe("experience");
    expect(hashId("#caf%C3%A9")).toBe("café");
    // A stray % would make decodeURIComponent throw and break the page.
    expect(hashId("#%")).toBe("%");
    expect(hashId("#100%")).toBe("100%");
    expect(hashId("#")).toBeNull();
    expect(hashId("")).toBeNull();
  });
});

describe("home section registry", () => {
  it("reads the desk screens first, then the page flow", () => {
    expect(homeSections.map((section) => section.id)).toEqual([
      "services",
      "experience",
      "stack",
      "about",
      "work",
      "research",
      "activity",
      "certificates",
      "contact",
    ]);
    expect(deskSections.map((section) => section.place)).toEqual([
      "monitor",
      "monitor",
      "laptop",
    ]);
  });
  it("labels every section in both languages", () => {
    for (const section of homeSections) {
      expect(section.label.en).not.toBe("");
      expect(section.label.tr).not.toBe("");
    }
    expect(homeSectionLinks("tr")[0]).toEqual({
      id: "services",
      label: "Ne yapıyorum",
    });
  });
  it("lists certificates only once there are some", () => {
    const ids = (certificates: boolean) =>
      homeSectionLinks("en", { certificates }).map((link) => link.id);
    expect(ids(false)).not.toContain("certificates");
    expect(ids(true)).toContain("certificates");
  });
});
