import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sharedFacts } from "../src/lib/content";
import { getIdentity } from "../src/lib/identity";
import { getAbout } from "../src/lib/home-content";
import { getJourneyContent } from "../src/lib/desk-story/content";
import { llmsFull, llmsIndex } from "../src/lib/llms";
import { pageMetadata } from "../src/lib/site";
import PortraitIdentity from "../src/components/desk/portrait-identity";

describe("public bilingual identity", () => {
  it("uses the approved name, occupation and place in home metadata", () => {
    const titles = {
      en: "Onur Ergüden — AI engineer in İzmir, Türkiye",
      tr: "Onur Ergüden — İzmir’de yapay zekâ mühendisi",
    };
    for (const locale of ["en", "tr"] as const) {
      const identity = getIdentity(locale);
      expect(identity.title).toBe(titles[locale]);
      expect(identity.location).toBe("İzmir, Türkiye");
      const metadata = pageMetadata(
        locale,
        "",
        identity.title,
        identity.description,
        { absolute: true },
      );
      expect(metadata.title).toEqual({ absolute: titles[locale] });
      expect(metadata.openGraph?.title).toBe(titles[locale]);
      expect(metadata.twitter?.description).toBe(identity.description);
      expect(identity.description.length).toBeLessThanOrEqual(160);
    }
  });

  it("renders the compact role and city without needing client effects", () => {
    for (const locale of ["en", "tr"] as const) {
      const content = getJourneyContent(locale);
      const html = renderToStaticMarkup(
        createElement(PortraitIdentity, {
          content,
          opening: true,
          interactive: false,
        }),
      );
      expect(html).toContain(
        `aria-label="${sharedFacts.name}, ${getIdentity(locale).role}, ${sharedFacts.location.city}"`,
      );
      expect(html).toMatch(/data-portrait-location="true">İzmir<\/span>/);
    }
  });

  it("shares the visible About bio and opportunity statement with AI text", () => {
    for (const locale of ["en", "tr"] as const) {
      const identity = getIdentity(locale);
      const about = getAbout(locale);
      expect(about.paragraphs[0]).toBe(identity.bio);
      expect(about.paragraphs.join(" ")).not.toContain("[[identity:");
      expect(identity.bio).not.toContain(sharedFacts.work.company);
    }
    expect(getIdentity("tr").bio).toContain("yapay zekâ mühendisiyim");
    for (const text of [llmsIndex(), llmsFull()]) {
      expect(text).toContain(getIdentity("en").location);
      expect(text).toContain(getIdentity("en").availability);
    }
    expect(llmsFull()).toContain(getAbout("en").paragraphs[0]);
  });

  it("keeps the publisher's full author names and order without implying publication", () => {
    expect(sharedFacts.publication.authors).toEqual([
      "Onur Ergüden",
      "Cem Başar Ceylani",
      "Efe Ayhan Şengül",
      "Sıla Yılmaz",
      "Ege Yılmaz",
      "Diaa Gadelmavla",
      "Mirkan Yusuf Kalkan",
    ]);
    expect(sharedFacts.publication.status).toBe("accepted");
    expect(sharedFacts.publication.statusLabel.en).toBe(
      "Accepted · publication pending",
    );
  });
});
