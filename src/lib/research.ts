import type { Locale } from "./content";

/** Research copy shared by the home teaser and the Research page. */
export function getResearch(locale: Locale) {
  const en = locale === "en";
  return {
    approach: en
      ? "My interests sit at the intersection of applied machine learning, data science and reliable AI systems. I want to understand how models behave beyond a single evaluation score."
      : "Uygulamalı makine öğrenmesi, veri bilimi ve güvenilir AI sistemleriyle ilgileniyorum. Modellerin davranışını tek bir değerlendirme puanının ötesinde anlamak istiyorum.",
    publicationSummary: en
      ? "A two-layer approach to current contamination detection and future water-safety trends."
      : "Mevcut kirliliğin tespiti ve gelecekteki su güvenliği eğilimleri için iki katmanlı yaklaşım.",
    questions: en
      ? [
          "How should retrieval systems behave when the available evidence cannot support an answer?",
          "How well do predictive models generalize across time and changing data sources?",
          "How can evaluation separate model quality from data leakage and dataset-specific shortcuts?",
        ]
      : [
          "Mevcut kanıt yanıtı desteklemiyorsa bilgi erişim sistemleri nasıl davranmalı?",
          "Tahmin modelleri zaman içinde ve veri kaynakları değiştiğinde ne kadar genellenebilir?",
          "Değerlendirme, model kalitesini veri sızıntısından ve veriye özgü kestirmelerden nasıl ayırabilir?",
        ],
  };
}
