import { getProjects, sharedFacts, type Locale } from "./content";
import type { JourneyContent } from "./desk-journey";
export function getJourneyContent(locale: Locale): JourneyContent {
  const en = locale === "en";
  const cv = process.env.NEXT_PUBLIC_CV_URL;
  return {
    name: sharedFacts.name,
    intro: en
      ? "I build AI systems that connect models, data and real products."
      : "Modelleri, veriyi ve gerçek ürünleri bir araya getiren AI sistemleri geliştiriyorum.",
    cv: cv || `mailto:${sharedFacts.email}?subject=CV%20request`,
    cvLabel: cv
      ? en
        ? "Download CV"
        : "CV’yi indir"
      : en
        ? "Request my CV"
        : "CV’mi iste",
    labels: en
      ? ["Selected work", "AI & research", "About & contact"]
      : ["Seçili çalışmalar", "AI ve araştırma", "Hakkımda ve iletişim"],
    screens: [
      getProjects(locale)
        .filter((p) => p.featured)
        .map((p) => ({
          title: p.title,
          body: p.summary.split(/(?<=[.!?])\s/)[0],
          href: `/${locale}/projects/${p.slug}`,
          action: en ? "Explore the project" : "Projeyi incele",
        })),
      [
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
      [
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
    ],
  };
}
