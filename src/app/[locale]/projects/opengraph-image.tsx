import { ImageResponse } from "next/og";
import { getProjects, isLocale } from "@/lib/content";
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
          ? "Onur Ergüden’in projeleri"
          : "Projects by Onur Ergüden",
      size: ogSize,
      contentType: "image/png",
    },
  ];
}

/** The archive: its title, the case studies by name and my name. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tr = isLocale(locale) && locale === "tr";
  const projects = getProjects(tr ? "tr" : "en");
  const cases = projects.filter((project) => project.featured);
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
        {upper(tr ? "Projeler" : "Projects", tr)}
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 34,
          lineHeight: 1.25,
          maxWidth: 1040,
          color: ogColors.accent,
        }}
      >
        {upper(cases.map((project) => project.title).join(" · "), false)}
      </div>
      <div style={{ marginTop: 34, fontSize: 24, color: ogColors.muted }}>
        {upper(
          tr
            ? `${projects.length} proje · Onur Ergüden`
            : `${projects.length} projects · Onur Ergüden`,
          tr,
        )}
      </div>
    </div>,
    { ...ogSize, fonts: await ogFonts() },
  );
}
