/**
 * Conceptual pipeline diagrams for the case studies, drawn for the dark
 * system. Every step is named in its case study; a diagram shows the order,
 * not measured performance.
 */
const ragSteps = {
  en: [
    "Course documents",
    "Hierarchical chunks",
    "SBERT embeddings",
    "FAISS search",
    "Filters + context",
    "Llama 3.1 (8B)",
    "Grounded answer",
  ],
  tr: [
    "Ders belgeleri",
    "Hiyerarşik parçalar",
    "SBERT embedding",
    "FAISS araması",
    "Filtre + bağlam",
    "Llama 3.1 (8B)",
    "Kaynaklı yanıt",
  ],
};

// Two rows: retrieval runs left to right, generation comes back right to left.
const boxes = [
  { x: 20, y: 40 },
  { x: 196, y: 40 },
  { x: 372, y: 40 },
  { x: 548, y: 40 },
  { x: 548, y: 214 },
  { x: 372, y: 214 },
  { x: 196, y: 214 },
] as const;
const width = 152;
const height = 72;

/** A seven-step flow in two rows: out along the top, back along the bottom. */
function FlowDiagram({
  id,
  labels,
  emphasis,
  lanes,
  locale,
}: {
  id: string;
  labels: string[];
  emphasis: Set<number>;
  /** Captions for the top row's direction and the bottom row's. */
  lanes: [string, string];
  locale: "en" | "tr";
}) {
  const en = locale === "en";
  return (
    <figure className="rag-diagram">
      <svg
        viewBox="0 0 720 330"
        role="img"
        aria-label={
          en
            ? `Conceptual diagram: ${labels.join(", then ")}.`
            : `Kavramsal diyagram: ${labels.join(", ardından ")}.`
        }
      >
        <defs>
          <marker
            id={`${id}-arrow`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill="#b7c2d4" />
          </marker>
        </defs>
        <g stroke="#b7c2d4" strokeWidth="1.5" fill="none">
          {boxes.slice(0, -1).map((box, i) => {
            const next = boxes[i + 1];
            const sameRow = box.y === next.y;
            const x1 = sameRow
              ? box.x + (next.x > box.x ? width : 0)
              : box.x + width / 2;
            const y1 = sameRow ? box.y + height / 2 : box.y + height;
            const x2 = sameRow
              ? next.x + (next.x > box.x ? 0 : width)
              : next.x + width / 2;
            const y2 = sameRow ? next.y + height / 2 : next.y;
            return (
              <line
                key={i}
                x1={x1 + (sameRow ? (next.x > box.x ? 4 : -4) : 0)}
                y1={y1 + (sameRow ? 0 : 4)}
                x2={x2 + (sameRow ? (next.x > box.x ? -6 : 6) : 0)}
                y2={y2 - (sameRow ? 0 : 6)}
                markerEnd={`url(#${id}-arrow)`}
              />
            );
          })}
        </g>
        {boxes.map((box, i) => (
          <g key={labels[i]}>
            <rect
              x={box.x}
              y={box.y}
              width={width}
              height={height}
              rx="14"
              fill={emphasis.has(i) ? "#d8f23c" : "#152039"}
              stroke={emphasis.has(i) ? "none" : "#ffffff2e"}
            />
            <text
              x={box.x + width / 2}
              y={box.y + height / 2 + 5}
              textAnchor="middle"
              fontSize="13.5"
              fontWeight="650"
              fontFamily="Manrope Variable, sans-serif"
              fill={emphasis.has(i) ? "#080e1c" : "#f5f6f8"}
            >
              {labels[i]}
            </text>
          </g>
        ))}
        <text
          x="20"
          y="318"
          fontSize="12"
          fontFamily="Manrope Variable, sans-serif"
          fill="#b7c2d4"
        >
          {lanes[0]} →
        </text>
        <text
          x="700"
          y="318"
          textAnchor="end"
          fontSize="12"
          fontFamily="Manrope Variable, sans-serif"
          fill="#b7c2d4"
        >
          ← {lanes[1]}
        </text>
      </svg>
      <figcaption>
        {en ? "Conceptual diagram" : "Kavramsal diyagram"}
      </figcaption>
    </figure>
  );
}

/** Course Intelligence: retrieval runs out, generation comes back. */
export default function RagDiagram({ locale }: { locale: "en" | "tr" }) {
  const en = locale === "en";
  return (
    <FlowDiagram
      id="rag"
      labels={ragSteps[locale]}
      emphasis={new Set([3, 5])}
      lanes={en ? ["Retrieval", "Generation"] : ["Bilgi getirme", "Üretim"]}
      locale={locale}
    />
  );
}

const gymrapSteps = {
  en: [
    "Health Connect",
    "Kotlin bridge",
    "Worker + D1",
    "Analysis engine",
    "MCP server · OAuth",
    "ChatGPT writes",
    "Gmail report",
  ],
  tr: [
    "Health Connect",
    "Kotlin köprüsü",
    "Worker + D1",
    "Analiz motoru",
    "MCP sunucusu · OAuth",
    "ChatGPT yazıyor",
    "Gmail raporu",
  ],
};

/** GymRap: data flows in and is analysed; the coach text and report come back. */
export function GymrapDiagram({ locale }: { locale: "en" | "tr" }) {
  const en = locale === "en";
  return (
    <FlowDiagram
      id="gymrap"
      labels={gymrapSteps[locale]}
      emphasis={new Set([3, 4])}
      lanes={en ? ["Data", "Coaching"] : ["Veri", "Koçluk"]}
      locale={locale}
    />
  );
}
