"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./xp.module.css";

/**
 * On phones the Explorer's full list runs about five screens, so it opens
 * with the first few technologies of each group and this button shows the
 * rest (xp.module.css). The list collapses only once this has run: without
 * JavaScript every technology stays in view. Wider screens ignore it.
 */
export default function ExplorerMore({
  locale,
  count,
  list,
}: {
  locale: "en" | "tr";
  count: number;
  /** The id of the list the button shows in full. */
  list: string;
}) {
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const explorer = button.current?.closest("[data-explorer]");
    if (open) explorer?.removeAttribute("data-collapsed");
    else explorer?.setAttribute("data-collapsed", "");
  }, [open]);
  return (
    <button
      ref={button}
      type="button"
      className={styles.more}
      aria-expanded={open}
      aria-controls={list}
      onClick={() => {
        // Closing from the end of the long list would leave the reader in
        // the space below it; keep the button, and its focus, in view.
        if (open)
          requestAnimationFrame(() =>
            button.current?.scrollIntoView({ block: "center" }),
          );
        setOpen(!open);
      }}
    >
      {open
        ? en
          ? "Show fewer"
          : "Daha az göster"
        : en
          ? `Show all ${count}`
          : `Tümünü göster (${count})`}
    </button>
  );
}
