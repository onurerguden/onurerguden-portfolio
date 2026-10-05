"use client";
import "@fontsource-variable/manrope";
import ErrorView from "@/components/site/error-view";
import "./globals.css";

/**
 * Replaces the root layout when it fails, so it brings its own document,
 * styles and font. The language is unknown here: it speaks both.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorView error={error} retry={retry} />
      </body>
    </html>
  );
}
