import { ImageResponse } from "next/og";
import { isLocale } from "@/lib/content";
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
          ? "Onur Ergüden’in yazıları"
          : "Writing by Onur Ergüden",
      size: ogSize,
      contentType: "image/png",
    },
  ];
}

/** Writing: the section and whose it is. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tr = isLocale(locale) && locale === "tr";
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
        {upper(tr ? "Yazılar" : "Writing", tr)}
      </div>
      <div style={{ marginTop: 34, fontSize: 34, color: ogColors.accent }}>
        {upper("Onur Ergüden", tr)}
      </div>
      <div style={{ marginTop: 14, fontSize: 24, color: ogColors.muted }}>
        {upper(
          tr
            ? "Ajanlar, MCP, RAG ve etraflarındaki yazılım"
            : "Agents, MCP, RAG and the software around them",
          tr,
        )}
      </div>
    </div>,
    { ...ogSize, fonts: await ogFonts() },
  );
}
