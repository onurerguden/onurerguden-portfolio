import type { Locale } from "./content";

/**
 * The Kuyumcum team's report workflow, as the case study shows it under the
 * chart and as /llms-full.txt carries it.
 */
export const reportWorkflowSrc = "/images/kuyumcum/report-workflow.webp";

export const reportWorkflow: Record<
  Locale,
  {
    alt: string;
    caption: string;
    summary: string;
    open: string;
    steps: string[];
  }
> = {
  en: {
    alt: "Flowchart of Kuyumcum's AI portfolio report: from the Flutter app through portfolio computation, evidence retrieval and four Gemini agents to the saved report. A step-by-step description follows.",
    caption:
      "The AI portfolio report workflow, simplified by the Kuyumcum team. It shows the order of the steps, not measured performance.",
    summary: "The chart, step by step",
    open: "Open the full-size chart",
    steps: [
      "The Flutter app prepares the user’s inventory and sends it with current prices and five years of price history.",
      "A callable Cloud Function checks authentication, quota and timeout before any work starts.",
      "Portfolio computation produces three inputs: return, volatility and drawdown statistics; P10, P50 and P90 forecast bands for 30 to 90 days; and allocation tables with priced holdings.",
      "An evidence retrieval layer grounds the report before generation. It reads recent news from the last 30 days with hybrid ranking and a re-ranker, historical news through vector search with BM25 and dense fusion and re-ranking, and macroeconomic sources through vector search filtered by the portfolio’s topics.",
      "A context bundle combines the portfolio facts, the evidence and the metrics.",
      "Four agents on Gemini Flash Lite read the bundle in parallel: a bull analyst, a bear analyst, a macro analyst and a risk manager.",
      "A synthesizer combines their findings into structured JSON, markdown and chart specifications.",
      "The report is stored in Firestore with its sources, and the Flutter report screen shows it with charts, analyst personas and sources.",
    ],
  },
  tr: {
    alt: "Kuyumcum'un AI portföy raporunun akış şeması (İngilizce): Flutter uygulamasından portföy hesaplaması, kanıt getirme ve dört Gemini ajanı üzerinden kaydedilen rapora. Adım adım açıklaması aşağıda.",
    caption:
      "Kuyumcum ekibinin sadeleştirdiği AI portföy raporu akışı. Adımların sırasını gösteriyor; ölçülmüş bir performans sunmuyor.",
    summary: "Şema adım adım",
    open: "Şemayı tam boyutta aç",
    steps: [
      "Flutter uygulaması kullanıcının varlıklarını hazırlıyor ve güncel fiyatlarla beş yıllık fiyat geçmişiyle birlikte gönderiyor.",
      "Çağrılabilir bir Cloud Function, iş başlamadan önce kimlik doğrulamayı, kotayı ve zaman aşımını denetliyor.",
      "Portföy hesaplaması üç girdi üretiyor: getiri, oynaklık ve düşüş istatistikleri; 30 ila 90 gün için P10, P50 ve P90 tahmin bantları; dağılım ve fiyatlanmış varlık tabloları.",
      "Kanıt getirme katmanı raporu üretimden önce temellendiriyor. Son 30 günün haberlerini hibrit sıralama ve yeniden sıralayıcıyla, geçmiş haberleri BM25 ile yoğun aramanın birleştirildiği ve yeniden sıralandığı vektör aramasıyla, makroekonomik kaynakları da portföyün konularına göre süzülen vektör aramasıyla getiriyor.",
      "Bağlam paketi portföy bilgilerini, kanıtları ve metrikleri bir araya getiriyor.",
      "Gemini Flash Lite üzerindeki dört ajan paketi paralel okuyor: yükseliş analisti, düşüş analisti, makro analist ve risk yöneticisi.",
      "Bir sentezleyici bulgularını yapılandırılmış JSON, markdown ve grafik tanımlarında birleştiriyor.",
      "Rapor kaynaklarıyla birlikte Firestore'a kaydediliyor; Flutter rapor ekranı onu grafikler, analist kişilikleri ve kaynaklarla gösteriyor.",
    ],
  },
};
