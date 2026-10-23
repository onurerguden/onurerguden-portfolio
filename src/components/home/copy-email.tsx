"use client";
import { useRef, useState } from "react";

/**
 * Copies the address to the clipboard and says so; mail clients are not
 * everyone's first choice. Where the browser cannot or will not copy (no
 * Clipboard API, a page not served securely, a refused permission), it says
 * that instead, and the address stays selectable text.
 */
export default function CopyEmail({
  email,
  locale,
  className,
}: {
  email: string;
  locale: "en" | "tr";
  className?: string;
}) {
  const en = locale === "en";
  const [result, setResult] = useState<"copied" | "failed" | null>(null);
  const reset = useRef(0);
  const failed = en ? "Copy failed" : "Kopyalanamadı";
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={async (event) => {
          const button = event.currentTarget;
          clearTimeout(reset.current);
          try {
            await navigator.clipboard.writeText(email);
            setResult("copied");
            import("@/lib/event-beacon").then(
              ({ locationOf, track }) =>
                track({ name: "email_copy", location: locationOf(button) }),
              () => {},
            );
          } catch {
            setResult("failed");
          }
          reset.current = window.setTimeout(() => setResult(null), 2500);
        }}
      >
        {result === "copied"
          ? en
            ? "Copied"
            : "Kopyalandı"
          : result === "failed"
            ? failed
            : en
              ? "Copy address"
              : "Adresi kopyala"}
      </button>
      <span className="visually-hidden" role="status">
        {result === "copied"
          ? en
            ? "Email address copied"
            : "E-posta adresi kopyalandı"
          : result === "failed"
            ? failed
            : ""}
      </span>
    </>
  );
}
