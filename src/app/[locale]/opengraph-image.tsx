import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isLocale } from "@/lib/content";

export const alt = "Onur Ergüden, AI engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonts = Promise.all(
  ["latin", "latin-ext"].map((part) =>
    readFile(join(process.cwd(), `assets/fonts/og-display-${part}.ttf`)),
  ),
);

/** A share card in the site's cosmic palette with the display face. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tr = isLocale(locale) && locale === "tr";
  const upper = (text: string) =>
    text.toLocaleUpperCase(tr ? "tr-TR" : "en-US");
  const [latin, latinExt] = await fonts;
  const balls = [
    { x: 930, y: 380, r: 92, fill: "#d8f23c" },
    { x: 1070, y: 300, r: 70, fill: "#f5f6f8" },
    { x: 1050, y: 470, r: 58, fill: "#e8762b" },
    { x: 860, y: 520, r: 46, fill: "#1947e5" },
  ];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 80px",
        background:
          "radial-gradient(circle at 70% 30%, #152039 0%, #080e1c 70%)",
        color: "#f5f6f8",
        fontFamily: '"Portfolio Display", "Portfolio Display Ext"',
        position: "relative",
      }}
    >
      {balls.map((ball) => (
        <div
          key={ball.x}
          style={{
            position: "absolute",
            left: ball.x - ball.r,
            top: ball.y - ball.r,
            width: ball.r * 2,
            height: ball.r * 2,
            borderRadius: "50%",
            background: ball.fill,
            boxShadow: "inset -18px -22px 40px rgba(0,0,0,0.35)",
          }}
        />
      ))}
      <div
        style={{
          fontSize: 112,
          lineHeight: 0.9,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span>ONUR</span>
        <span>ERGÜDEN</span>
      </div>
      <div style={{ marginTop: 34, fontSize: 40, color: "#d8f23c" }}>
        {upper(tr ? "AI mühendisi" : "AI engineer")}
      </div>
      <div style={{ marginTop: 14, fontSize: 24, color: "#b7c2d4" }}>
        {upper("RAG · agents · ML · full-stack")}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Portfolio Display",
          data: latin,
          weight: 900,
          style: "normal",
        },
        // Satori keeps one file per family, weight and style, so the
        // Turkish capitals need a family of their own to be found.
        {
          name: "Portfolio Display Ext",
          data: latinExt,
          weight: 900,
          style: "normal",
        },
      ],
    },
  );
}
