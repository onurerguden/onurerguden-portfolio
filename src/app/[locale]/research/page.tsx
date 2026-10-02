import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, sharedFacts } from "@/lib/content";
import { pageMetadata } from "@/lib/site";
import { getResearch } from "@/lib/research";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata(
    locale,
    "/research",
    locale === "en" ? "Research" : "Araştırma",
    locale === "en"
      ? "Applied AI, machine learning and data science research by Onur Ergüden."
      : "Onur Ergüden’in uygulamalı AI, makine öğrenmesi ve veri bilimi araştırmaları.",
  );
}
export default async function ResearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const en = locale === "en";
  const publication = sharedFacts.publication;
  const research = getResearch(locale);
  return (
    <main id="main" tabIndex={-1}>
      <div className="page-intro">
        <p className="section-kicker">
          {en ? "Research & academic work" : "Araştırma ve akademik çalışmalar"}
        </p>
        <h1>
          {en
            ? "Better questions. Grounded answers."
            : "Daha iyi sorular. Sağlam yanıtlar."}
        </h1>
        <p>{research.approach}</p>
      </div>
      <section
        className="research-publication"
        aria-label={en ? "Publication" : "Yayın"}
      >
        <p className="publication-status">{publication.statusLabel[locale]}</p>
        <h2>{publication.title}</h2>
        <p>{publication.authors.join(", ")}</p>
        <p>
          <strong>{publication.journal}</strong>
        </p>
        <p>{research.publicationSummary}</p>
        <Link className="text-link" href={`/${locale}/projects/water-safety`}>
          {en ? "Read the research project" : "Araştırma projesini oku"} ↗
        </Link>
      </section>
      <div className="research-columns">
        <section>
          <h2>
            {en ? "Questions I’m exploring" : "Üzerinde düşündüğüm sorular"}
          </h2>
          <ul>
            {research.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>{en ? "Academic foundation" : "Akademik temel"}</h2>
          <p>
            <strong>
              {en
                ? "İzmir University of Economics"
                : "İzmir Ekonomi Üniversitesi"}
            </strong>
            <br />
            {en
              ? "BSc in Software Engineering, June 2026"
              : "Yazılım Mühendisliği Lisans, Haziran 2026"}
            <br />
            {en ? "GPA" : "Not ortalaması"}: {sharedFacts.education.gpa}
          </p>
          <p>
            {en
              ? "Google AI & Technology Academy graduate. Completed Deep Learning training in 2026."
              : "Google Yapay Zekâ ve Teknoloji Akademisi mezunu. Derin öğrenme eğitimini 2026’da tamamladım."}
          </p>
          <p>
            {en
              ? "Academic interests: AI, machine learning, data science and software architecture."
              : "Akademik ilgi alanları: AI, makine öğrenmesi, veri bilimi ve yazılım mimarisi."}
          </p>
        </section>
      </div>
    </main>
  );
}
