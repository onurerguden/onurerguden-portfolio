"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const noChange = () => () => {};
const clipboardReady = () =>
  typeof navigator.clipboard?.writeText === "function";

/**
 * Copies the address to the clipboard and says so; mail clients are not
 * everyone's first choice. Without the Clipboard API (an old browser, a page
 * not served securely) the button is not offered, and the address stays
 * selectable text. A copy the browser refuses says so too.
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
  // The server renders the button; a browser without the API removes it.
  const available = useSyncExternalStore(noChange, clipboardReady, () => true);
  const [result, setResult] = useState<"copied" | "failed" | null>(null);
  const reset = useRef(0);
  useEffect(() => () => window.clearTimeout(reset.current), []);
  if (!available) return null;
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={async (event) => {
          const button = event.currentTarget;
          window.clearTimeout(reset.current);
          try {
            await navigator.clipboard.writeText(email);
            setResult("copied");
            import("@/lib/event-beacon").then(
              ({ locationOf, track }) =>
                track({ name: "email_copy", location: locationOf(button) }),
              () => {},
            );
          } catch {
            // Permission refused, or the page lost focus mid-copy.
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
            ? en
              ? "Copy failed"
              : "Kopyalanamadı"
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
            ? en
              ? "The address could not be copied; select it to copy it yourself"
              : "Adres kopyalanamadı; seçerek kendiniz kopyalayabilirsiniz"
            : ""}
      </span>
    </>
  );
}
