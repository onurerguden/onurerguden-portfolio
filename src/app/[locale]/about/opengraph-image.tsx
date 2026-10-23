import { ImageResponse } from "next/og";
import { isLocale, sharedFacts } from "@/lib/content";
import { getIdentity } from "@/lib/identity";
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
        params.locale === "tr" ? "Onur Ergüden hakkında" : "About Onur Ergüden",
      size: ogSize,
      contentType: "image/png",
    },
  ];
}

/** About: my name, the role and where I work. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tr = isLocale(locale) && locale === "tr";
  const identity = getIdentity(tr ? "tr" : "en");
  const { work, teaching } = sharedFacts;
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
      <div style={{ fontSize: 26, color: ogColors.muted }}>
        {upper(tr ? "Hakkımda" : "About", tr)}
      </div>
      <div style={{ marginTop: 18, fontSize: 120, lineHeight: 0.9 }}>
        {upper(sharedFacts.name, tr)}
      </div>
      <div style={{ marginTop: 34, fontSize: 40, color: ogColors.accent }}>
        {upper(identity.headline, tr)}
      </div>
      <div style={{ marginTop: 14, fontSize: 24, color: ogColors.muted }}>
        {upper(`${work.company} · ${teaching.company}`, false)}
      </div>
    </div>,
    { ...ogSize, fonts: await ogFonts() },
  );
}
