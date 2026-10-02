import { sharedFacts, type Locale } from "../content";

export type JourneyCard = {
  title: string;
  body: string;
  href: string;
  action: string;
};
export type JourneyChapter = { label: string; cards: JourneyCard[] };
export type JourneyContent = {
  name: string;
  role: string;
  /** Research cards shown before About until the home flow is reordered. */
  research: JourneyChapter;
};

export function getJourneyContent(locale: Locale): JourneyContent {
  const en = locale === "en";
  return {
    name: sharedFacts.name,
    role: en ? "AI engineer" : "AI mühendisi",
    research: {
      label: en ? "AI & research" : "AI ve araştırma",
      cards: [
        {
          title: en ? "Questions worth testing." : "Sınanmaya değer sorular.",
          body: en
            ? "Applied machine learning, data science and reliable AI systems."
            : "Uygulamalı makine öğrenmesi, veri bilimi ve güvenilir AI sistemleri.",
          href: `/${locale}/research`,
          action: en ? "My research" : "Araştırmalarım",
        },
        {
          title: en
            ? "Water safety, in two layers."
            : "Su güvenliği, iki katmanda.",
          body: en
            ? "Current contamination detection and future water-safety trends."
            : "Mevcut kirliliğin tespiti ve gelecekteki su güvenliği eğilimleri.",
          href: `/${locale}/projects/water-safety`,
          action: en ? "Read the study" : "Çalışmayı oku",
        },
        {
          title: sharedFacts.publication.statusLabel[locale],
          body: sharedFacts.publication.journal,
          href: `/${locale}/research`,
          action: en ? "Publication details" : "Yayın ayrıntıları",
        },
      ],
    },
  };
}
