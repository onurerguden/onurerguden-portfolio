import Image from "next/image";
import type { Project } from "@/lib/content";
import RagDiagram, { GymrapDiagram } from "./flow-diagrams";
import styles from "./case.module.css";

/**
 * A case study's real media: app screens in device frames, other screens
 * (emails) flat, figures with captions, and a conceptual diagram where the
 * case study names its pipeline. Nothing is drawn in place of a missing
 * screenshot.
 */
export default function CaseMedia({
  project,
  locale,
}: {
  project: Project;
  locale: "en" | "tr";
}) {
  const diagram =
    project.slug === "course-intelligence" ? (
      <RagDiagram locale={locale} />
    ) : project.slug === "gymrap-ai-coach" ? (
      <GymrapDiagram locale={locale} />
    ) : null;
  const media = project.media ?? [];
  const kind = media[0]?.kind;
  const gallery = !media.length ? null : (
    <div
      className={
        kind === "phone"
          ? styles.phones
          : kind === "screen"
            ? styles.screens
            : styles.figures
      }
    >
      {media.map((item, i) => (
        <figure
          key={item.src}
          className={
            kind === "phone"
              ? styles.phone
              : kind === "screen"
                ? styles.screen
                : styles.figure
          }
        >
          <Image
            src={item.src}
            alt={item.alt}
            width={item.width}
            height={item.height}
            sizes={
              kind === "figure"
                ? "(max-width: 900px) 92vw, 1100px"
                : "(max-width: 700px) 44vw, 300px"
            }
            priority={i === 0 && !diagram}
          />
          {kind === "phone" ? null : <figcaption>{item.alt}</figcaption>}
        </figure>
      ))}
    </div>
  );
  if (!diagram) return gallery;
  return (
    <>
      <div className={styles.diagram}>{diagram}</div>
      {gallery}
    </>
  );
}
