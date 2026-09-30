import type { CSSProperties } from "react";
import { displayLineWidth, titleSegments } from "@/lib/display-title";

type Props = {
  /** One title line per `\n`; wrap brand names in `[ ]` to keep English capitals. */
  text: string;
  locale: "en" | "tr";
  as?: "h1" | "h2" | "h3" | "p";
  /** Largest font size in px, reached on wide screens. */
  max?: number;
  /** Share of the container width the longest line fills (0–100). */
  fill?: number;
  id?: string;
  className?: string;
};

/**
 * Heavy, uppercase section title that fills its width exactly. The width is
 * measured on the server from the subset font's metrics, so there is no
 * client JavaScript and no reflow once the font arrives.
 */
export default function GiantTitle({
  text,
  locale,
  as: Tag = "h2",
  max = 208,
  fill = 92,
  id,
  className,
}: Props) {
  const lines = text.split("\n");
  const em = Math.max(...lines.map((line) => displayLineWidth(line, locale)));
  return (
    <Tag
      id={id}
      className={className ? `giant-title ${className}` : "giant-title"}
      style={
        {
          "--title-em": em.toFixed(3),
          "--giant-max": `${max}px`,
          "--giant-fill": fill,
        } as CSSProperties
      }
    >
      {lines.map((line, index) => (
        <span className="giant-title-line" key={index}>
          {titleSegments(line).map((segment, i) =>
            segment.lang ? (
              <span lang={segment.lang} key={i}>
                {segment.text}
              </span>
            ) : (
              segment.text
            ),
          )}
        </span>
      ))}
    </Tag>
  );
}
