import Image from "next/image";
import { useId } from "react";
export default function ProjectArt({
  slug,
  locale = "en",
}: {
  slug: string;
  locale?: "en" | "tr";
}) {
  const patternId = useId();
  if (slug === "kuyumcum")
    return (
      <div className="project-art kuyumcum-art">
        <div className="app-wordmark">kuyumcum</div>
        <div className="phone-pair">
          <Image
            src="/images/kuyumcum/map.webp"
            alt={
              locale === "en"
                ? "Kuyumcum jeweler discovery map"
                : "Kuyumcum kuyumcu keşif haritası"
            }
            width={756}
            height={1638}
            sizes="(max-width: 650px) 140px, 210px"
          />
          <Image
            src="/images/kuyumcum/ai-reports.webp"
            alt={
              locale === "en"
                ? "Kuyumcum AI report list"
                : "Kuyumcum AI rapor listesi"
            }
            width={756}
            height={1638}
            sizes="(max-width: 650px) 140px, 210px"
          />
        </div>
      </div>
    );
  if (slug === "water-safety")
    return (
      <div className="project-art water-art">
        <svg
          viewBox="0 0 600 360"
          role="img"
          aria-label={
            locale === "en"
              ? "Conceptual diagram: water observations feed detection and forecasting"
              : "Kavramsal diyagram: su gözlemlerinden tespit ve tahmin"
          }
        >
          <defs>
            <pattern
              id={patternId}
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="#aec9d2" />
            </pattern>
          </defs>
          <rect width="600" height="360" fill={`url(#${patternId})`} />
          <g fill="none" stroke="#1c6478" strokeWidth="2">
            <path d="M70 180H240M300 180V95H490M300 180V265H490" />
            <circle cx="300" cy="180" r="52" fill="#e6f0f3" />
            <circle cx="70" cy="180" r="8" fill="#1c6478" />
            <circle cx="490" cy="95" r="8" fill="#1c6478" />
            <circle cx="490" cy="265" r="8" fill="#1c6478" />
            <path d="M300 151c-7 12-19 24-19 35a19 19 0 0 0 38 0c0-11-12-23-19-35Z" />
          </g>
          <g fill="#23566a" fontSize="17" fontFamily="sans-serif">
            <text x="38" y="218">
              {locale === "en" ? "Observe" : "Gözlem"}
            </text>
            <text x="407" y="76">
              {locale === "en" ? "Detect" : "Tespit"}
            </text>
            <text x="407" y="302">
              {locale === "en" ? "Forecast" : "Tahmin"}
            </text>
          </g>
        </svg>
        <span className="art-caption">
          {locale === "en"
            ? "Reactive + proactive intelligence"
            : "Reaktif + proaktif zekâ"}
        </span>
      </div>
    );
  return (
    <div className="project-art rag-art">
      <div className="retrieval-diagram">
        <div className="document-stack" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="diagram-connector" />
        <div className="retrieval-core">FAISS</div>
        <span className="diagram-connector" />
        <div className="answer-block">
          {locale === "en" ? "Grounded answer" : "Kaynaklı yanıt"}
          <span>Llama 3.1</span>
        </div>
      </div>
      <div className="rag-caption">
        <span>SBERT</span>
        <span>
          {locale === "en" ? "Semantic retrieval" : "Anlamsal erişim"}
        </span>
        <span>{locale === "en" ? "Context control" : "Bağlam kontrolü"}</span>
      </div>
    </div>
  );
}
