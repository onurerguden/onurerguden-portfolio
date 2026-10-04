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
    /**
     * A course project kept apart from the paper: it was never submitted for
     * peer review, so it carries no venue, author list or headline metric.
     */
    study: {
      status: en
        ? "Independent study · not submitted for peer review"
        : "Bağımsız çalışma · hakemli yayına gönderilmedi",
      title: en
        ? "Clustering and forecasting public transport ridership in İzmir"
        : "İzmir’de toplu taşıma yolculuklarının kümelenmesi ve tahmini",
      team: en
        ? "Three-person CE 477 course project"
        : "Üç kişilik CE 477 ders projesi",
      data: en
        ? "25,775 daily İzmirim Kart ridership rows by operator and fare type, January 2021 – April 2025."
        : "Ocak 2021 – Nisan 2025 arasında işletme ve tarife türüne göre 25.775 günlük İzmirim Kart yolcu kaydı.",
      method: en
        ? "DBSCAN clustering, seasonal features and demand forecasting with XGBoost and Random Forest."
        : "DBSCAN kümeleme, mevsimsel özellikler ve XGBoost ile Random Forest kullanan talep tahmini.",
      repoUrl: "https://github.com/onurerguden/IZMIR-PUBLIC-TRANSPORTATION-ML",
    },
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
