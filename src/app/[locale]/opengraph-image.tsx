import { ImageResponse } from "next/og";
import { isLocale } from "@/lib/content";
import {
  ogBackground,
  ogColors,
  ogFontFamily,
  ogFonts,
  ogPicture,
  ogSize,
  upper,
} from "@/lib/og";

/**
 * One card per page, described in the page's language. The id names the card
 * in its URL (`…/opengraph-image/card`).
 */
export function generateImageMetadata({
  params,
}: {
  params: { locale: string };
}) {
  return [
    {
      id: "card",
      alt:
        params.locale === "tr"
          ? "Onur Ergüden, AI mühendisi"
          : "Onur Ergüden, AI engineer",
      size: ogSize,
      contentType: "image/png",
    },
  ];
}

/** The opening, as a card: my name, the head illustration and my role. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tr = isLocale(locale) && locale === "tr";
  const head = await ogPicture("head");
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 80px",
        background: ogBackground,
        color: ogColors.text,
        fontFamily: ogFontFamily,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 118,
            lineHeight: 0.9,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>ONUR</span>
          <span>ERGÜDEN</span>
        </div>
        <div style={{ marginTop: 34, fontSize: 40, color: ogColors.accent }}>
          {upper(tr ? "AI mühendisi" : "AI engineer", tr)}
        </div>
        <div style={{ marginTop: 14, fontSize: 24, color: ogColors.muted }}>
          {upper("RAG · agents · ML · full-stack", tr)}
        </div>
      </div>
      <img src={head} width={400} height={400} alt="" />
    </div>,
    { ...ogSize, fonts: await ogFonts() },
  );
}
