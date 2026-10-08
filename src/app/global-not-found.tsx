import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import { pageIcons } from "@/lib/icons";
import NotFoundContent from "./not-found-content";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found | Onur Ergüden",
  robots: { index: false },
  icons: pageIcons(),
};

/**
 * A path outside both languages. The root layout lives under the language
 * segment, so this page brings its own document; it speaks both languages.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <NotFoundContent />
      </body>
    </html>
  );
}
