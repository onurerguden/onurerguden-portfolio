import { ImageResponse } from "next/og";
import { getProject, isLocale } from "@/lib/content";
import {
  ogBackground,
  ogColors,
  ogFontFamily,
  ogFonts,
  ogPicture,
  ogSize,
  upper,
} from "@/lib/og";

export const alt = "A case study by Onur Ergüden";
export const size = ogSize;
export const contentType = "image/png";

const pictures: Record<
  string,
  { name: string; width: number; height: number }
> = {
  kuyumcum: { name: "kuyumcum", width: 217, height: 470 },
  "water-safety": { name: "water-safety", width: 520, height: 257 },
};

/** A case study as a card: its name, category, real media and my name. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const tr = isLocale(locale) && locale === "tr";
  const project = getProject(tr ? "tr" : "en", slug);
  const picture = pictures[slug];
  const src = picture ? await ogPicture(picture.name) : null;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 48,
        padding: "0 80px",
        background: ogBackground,
        color: ogColors.text,
        fontFamily: ogFontFamily,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 560 }}>
        <div style={{ fontSize: 24, color: ogColors.accent }}>
          {upper(project?.category ?? "", tr)}
        </div>
        <div style={{ marginTop: 24, fontSize: 84, lineHeight: 0.95 }}>
          {upper(project?.title ?? "Onur Ergüden", false)}
        </div>
        <div style={{ marginTop: 40, fontSize: 26, color: ogColors.muted }}>
          ONUR ERGÜDEN
        </div>
      </div>
      {src && picture ? (
        <div
          style={{
            display: "flex",
            padding: 18,
            borderRadius: 28,
            background: ogColors.surface,
          }}
        >
          <img
            src={src}
            width={picture.width}
            height={picture.height}
            alt=""
            style={{ borderRadius: 16 }}
          />
        </div>
      ) : (
        // Course Intelligence has no screenshot: its pipeline, as in the
        // case study's conceptual diagram.
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {["SBERT", "FAISS", "LLAMA 3.1 (8B)"].map((step, i) => (
            <div
              key={step}
              style={{
                display: "flex",
                padding: "18px 28px",
                borderRadius: 18,
                background: i ? ogColors.accent : ogColors.surface,
                color: i ? ogColors.ink : ogColors.text,
                fontSize: 30,
              }}
            >
              {step}
            </div>
          ))}
        </div>
      )}
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
