import { ImageResponse } from "next/og";
import { isLocale } from "@/lib/content";
import { formatDay, getPost } from "@/lib/writing";
import {
  ogBackground,
  ogColors,
  ogFontFamily,
  ogFonts,
  ogSize,
  upper,
} from "@/lib/og";

/** One card per article, described in the article's language. */
export function generateImageMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const tr = params.locale === "tr";
  const title = getPost(tr ? "tr" : "en", params.slug)?.title;
  return [
    {
      id: "card",
      alt: tr
        ? `${title}: Onur Ergüden’in yazısı`
        : `${title}: an article by Onur Ergüden`,
      size: ogSize,
      contentType: "image/png",
    },
  ];
}

/** An article as a card: the section, its title, my name and the date. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const tr = isLocale(locale) && locale === "tr";
  const post = getPost(tr ? "tr" : "en", slug);
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
      <div style={{ fontSize: 26, color: ogColors.accent }}>
        {upper(tr ? "Yazılar" : "Writing", tr)}
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 60,
          lineHeight: 1.08,
          maxWidth: 1040,
        }}
      >
        {upper(post?.title ?? "", tr)}
      </div>
      <div style={{ marginTop: 36, fontSize: 26, color: ogColors.muted }}>
        {upper(
          `Onur Ergüden · ${post ? formatDay(post.published, tr ? "tr" : "en") : ""}`,
          tr,
        )}
      </div>
    </div>,
    { ...ogSize, fonts: await ogFonts() },
  );
}
