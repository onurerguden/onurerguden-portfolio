import { ImageResponse } from "next/og";
import { isLocale, sharedFacts } from "@/lib/content";
import {
  ogBackground,
  ogColors,
  ogFontFamily,
  ogFonts,
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
          ? "Onur Ergüden’in araştırması"
          : "Research by Onur Ergüden",
      size: ogSize,
      contentType: "image/png",
    },
  ];
}

/** Research: the accepted paper and its status. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tr = isLocale(locale) && locale === "tr";
  const { publication } = sharedFacts;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 80px",
        background: ogBackground,
        color: ogColors.text,
        fontFamily: ogFontFamily,
      }}
    >
      <div style={{ fontSize: 120, lineHeight: 0.9 }}>
        {upper(tr ? "Araştırma" : "Research", tr)}
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 34,
          lineHeight: 1.15,
          maxWidth: 1000,
        }}
      >
        {upper(publication.title, false)}
      </div>
      <div style={{ display: "flex", marginTop: 34 }}>
        <div
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: ogColors.accent,
            color: ogColors.ink,
            fontSize: 22,
          }}
        >
          {upper(publication.statusLabel[tr ? "tr" : "en"], tr)}
        </div>
      </div>
    </div>,
    { ...ogSize, fonts: await ogFonts() },
  );
}
