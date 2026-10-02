import Image from "next/image";
import type { Project } from "@/lib/content";
import RagDiagram from "./rag-diagram";
import styles from "./case.module.css";

/**
 * A case study's real media: Kuyumcum's two approved screens in device
 * frames, HealthFactor-AI's figures with captions, and Course Intelligence's
 * conceptual diagram. Nothing is drawn in place of a missing screenshot.
 */
export default function CaseMedia({
  project,
  locale,
}: {
  project: Project;
  locale: "en" | "tr";
}) {
  if (project.slug === "course-intelligence")
    return (
      <div className={styles.diagram}>
        <RagDiagram locale={locale} />
      </div>
    );
  const media = project.media ?? [];
  if (!media.length) return null;
  const phones = media.every((item) => item.height > item.width);
  return (
    <div className={phones ? styles.phones : styles.figures}>
      {media.map((item, i) => (
        <figure
          key={item.src}
          className={phones ? styles.phone : styles.figure}
        >
          <Image
            src={item.src}
            alt={item.alt}
            width={item.width}
            height={item.height}
            sizes={
              phones
                ? "(max-width: 700px) 44vw, 300px"
                : "(max-width: 900px) 92vw, 1100px"
            }
            priority={i === 0}
          />
          {phones ? null : <figcaption>{item.alt}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
