"use client";
import { useState } from "react";

/**
 * Copies the address to the clipboard and says so; mail clients are not
 * everyone's first choice. Without the Clipboard API the button is not
 * offered, and the address stays selectable text.
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
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(email);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied
          ? en
            ? "Copied"
            : "Kopyalandı"
          : en
            ? "Copy address"
            : "Adresi kopyala"}
      </button>
      <span className="visually-hidden" role="status">
        {copied
          ? en
            ? "Email address copied"
            : "E-posta adresi kopyalandı"
          : ""}
      </span>
    </>
  );
}
