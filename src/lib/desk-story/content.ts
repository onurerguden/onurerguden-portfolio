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
  /** The MacBook's pages until it becomes the XP desktop. */
  laptop: JourneyChapter;
};

export function getJourneyContent(locale: Locale): JourneyContent {
  const en = locale === "en";
  const cv = process.env.NEXT_PUBLIC_CV_URL;
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
    laptop: {
      label: en ? "About & contact" : "Hakkımda ve iletişim",
      cards: [
        {
          title: sharedFacts.name,
          body: en
            ? "I’m a software engineering graduate building AI products."
            : "AI ürünleri geliştiren bir yazılım mühendisliği mezunuyum.",
          href: cv || `mailto:${sharedFacts.email}?subject=CV%20request`,
          action: cv
            ? en
              ? "Download CV"
              : "CV’yi indir"
            : en
              ? "Request my CV"
              : "CV’mi iste",
        },
        {
          title: en ? "Let’s connect." : "Tanışalım.",
          body: en
            ? "Good work starts with a conversation."
            : "İyi işler bir sohbetle başlar.",
          href: `mailto:${sharedFacts.email}`,
          action: en ? "Email me" : "Bana yaz",
        },
      ],
    },
  };
}
